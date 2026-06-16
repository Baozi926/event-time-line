import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '@event-time-line/shared';
import { SESSION_COOKIE, resolveSessionUser } from './session.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
  }
}

export async function attachUser(req: FastifyRequest): Promise<void> {
  const token = req.cookies[SESSION_COOKIE];
  req.user = await resolveSessionUser(token);
}

export function requireUser(
  req: FastifyRequest,
  reply: FastifyReply,
): req is FastifyRequest & { user: User } {
  if (!req.user) {
    reply.status(401).send({ error: '请先登录' });
    return false;
  }
  return true;
}

export function requireAdmin(
  req: FastifyRequest,
  reply: FastifyReply,
): req is FastifyRequest & { user: User } {
  if (!requireUser(req, reply)) return false;
  if (req.user.role !== 'admin') {
    reply.status(403).send({ error: '需要管理员权限' });
    return false;
  }
  return true;
}
