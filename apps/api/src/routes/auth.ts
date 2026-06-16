import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { SESSION_COOKIE, SESSION_TTL_DAYS, createSession, deleteSession } from '../auth/session.js';
import { requireUser } from '../auth/middleware.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/v1/auth/register', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 6 },
          displayName: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (req, reply) => {
    const body = req.body as { email: string; password: string; displayName?: string };
    const email = normalizeEmail(body.email);
    const password = body.password;
    const displayName = body.displayName?.trim().slice(0, 100) || undefined;

    if (!EMAIL_RE.test(email)) {
      return reply.status(400).send({ error: '邮箱格式不正确' });
    }
    if (password.length < 6) {
      return reply.status(400).send({ error: '密码至少 6 位' });
    }

    const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: '该邮箱已注册' });
    }

    const passwordHash = hashPassword(password);
    const inserted = await query<{ id: string }>(
      `INSERT INTO users (email, display_name, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id`,
      [email, displayName ?? null, passwordHash],
    );

    const userId = inserted.rows[0].id;
    const token = await createSession(userId);
    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);

    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions());
    const user = await resolveUserById(userId);
    return { user };
  });

  app.post('/api/v1/auth/login', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const body = req.body as { email: string; password: string };
    const email = normalizeEmail(body.email);

    const res = await query<{
      id: string;
      password_hash: string | null;
    }>('SELECT id, password_hash FROM users WHERE email = $1', [email]);

    const row = res.rows[0];
    if (!row?.password_hash || !verifyPassword(body.password, row.password_hash)) {
      return reply.status(401).send({ error: '邮箱或密码错误' });
    }

    const token = await createSession(row.id);
    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [row.id]);

    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions());
    const user = await resolveUserById(row.id);
    return { user };
  });

  app.post('/api/v1/auth/logout', {
    schema: { tags: ['auth'] },
  }, async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) {
      await deleteSession(token);
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { success: true };
  });

  app.get('/api/v1/auth/me', {
    schema: { tags: ['auth'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;
    return { user: req.user };
  });

  app.patch('/api/v1/auth/profile', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', maxLength: 100 },
          locale: { type: 'string', enum: ['zh-CN', 'en'] },
        },
      },
    },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const body = (req.body ?? {}) as {
      displayName?: string;
      locale?: string;
    };
    const displayName = body.displayName?.trim().slice(0, 100) || null;
    const locale = body.locale === 'en' ? 'en' : 'zh-CN';

    await query(
      `UPDATE users
       SET display_name = $1, locale = $2, updated_at = NOW()
       WHERE id = $3`,
      [displayName, locale, req.user.id],
    );

    const user = await resolveUserById(req.user.id);
    return { user, message: '个人信息已更新' };
  });

  app.post('/api/v1/auth/change-password', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const body = req.body as { currentPassword: string; newPassword: string };
    const { currentPassword, newPassword } = body;

    if (newPassword.length < 6) {
      return reply.status(400).send({ error: '新密码至少 6 位' });
    }
    if (currentPassword === newPassword) {
      return reply.status(400).send({ error: '新密码不能与当前密码相同' });
    }

    const res = await query<{ password_hash: string | null }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id],
    );
    const stored = res.rows[0]?.password_hash;
    if (!stored || !verifyPassword(currentPassword, stored)) {
      return reply.status(401).send({ error: '当前密码不正确' });
    }

    const passwordHash = hashPassword(newPassword);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, req.user.id],
    );
    await query(`DELETE FROM sessions WHERE user_id = $1`, [req.user.id]);

    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { success: true, message: '密码已更新，请重新登录' };
  });
}

async function resolveUserById(userId: string) {
  const res = await query<{
    id: string;
    email: string;
    display_name: string | null;
    role: 'admin' | 'user';
    locale: string;
    created_at: Date;
  }>(
    `SELECT id, email, display_name, role, locale, created_at FROM users WHERE id = $1`,
    [userId],
  );
  const row = res.rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? undefined,
    role: row.role,
    locale: row.locale,
    createdAt: row.created_at.toISOString(),
  };
}
