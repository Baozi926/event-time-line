import { createHash, randomBytes } from 'node:crypto';
import { query } from '@event-time-line/database';
import type { User, UserRole } from '@event-time-line/shared';

export const SESSION_COOKIE = 'etl_session';
export const SESSION_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()],
  );

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
}

export async function resolveSessionUser(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  const res = await query<{
    id: string;
    email: string;
    display_name: string | null;
    role: UserRole;
    locale: string;
    created_at: Date;
  }>(
    `SELECT u.id, u.email, u.display_name, u.role, u.locale, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)],
  );

  const row = res.rows[0];
  if (!row?.email) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? undefined,
    role: row.role,
    locale: row.locale,
    createdAt: row.created_at.toISOString(),
  };
}
