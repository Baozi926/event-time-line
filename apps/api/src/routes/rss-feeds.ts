import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import { MAX_RSS_FEEDS, RSS_FEED_INTERVAL_OPTIONS, type CreateRssFeedInput, type UpdateRssFeedInput } from '@event-time-line/shared';
import { mapRssFeed } from '../mappers.js';
import { extractDomainFromUrl, probeFeedUrl, validateFeedUrl } from '../utils/feed-url.js';
import { requireAdmin } from '../auth/middleware.js';

function normalizeLanguage(lang?: string): string {
  const value = (lang ?? 'en').trim().toLowerCase().slice(0, 10);
  return value || 'en';
}

function normalizeName(name: string): string {
  return name.trim().slice(0, 200);
}

function normalizeFeedInterval(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || !(RSS_FEED_INTERVAL_OPTIONS as readonly number[]).includes(minutes)) {
    return undefined;
  }
  return minutes;
}

export async function rssFeedRoutes(app: FastifyInstance) {
  app.get('/api/v1/rss-feeds', {
    schema: { tags: ['rss-feeds'] },
  }, async () => {
    const res = await query(
      `SELECT * FROM rss_feeds ORDER BY sort_order, created_at`,
    );
    return { feeds: res.rows.map(mapRssFeed) };
  });

  app.post('/api/v1/rss-feeds', {
    schema: { tags: ['rss-feeds'] },
  }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const body = (req.body ?? {}) as CreateRssFeedInput;
    const name = normalizeName(body.name ?? '');
    if (!name) {
      return reply.status(400).send({ error: '请填写 Feed 名称' });
    }

    const urlCheck = validateFeedUrl(body.url ?? '');
    if (!urlCheck.ok) {
      return reply.status(400).send({ error: urlCheck.error });
    }

    const count = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM rss_feeds',
    );
    if (parseInt(count.rows[0].count, 10) >= MAX_RSS_FEEDS) {
      return reply.status(400).send({ error: `最多添加 ${MAX_RSS_FEEDS} 个 RSS Feed` });
    }

    const probe = await probeFeedUrl(urlCheck.url);
    if (!probe.ok) {
      return reply.status(400).send({ error: probe.error });
    }

    const domain = body.domain?.trim() || extractDomainFromUrl(urlCheck.url);
    const language = normalizeLanguage(body.language);

    try {
      const res = await query(
        `INSERT INTO rss_feeds (name, url, domain, language, enabled, sort_order)
         VALUES ($1, $2, $3, $4, TRUE, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM rss_feeds))
         RETURNING *`,
        [name, urlCheck.url, domain, language],
      );
      return { feed: mapRssFeed(res.rows[0]) };
    } catch (err) {
      if (err instanceof Error && err.message.includes('unique')) {
        return reply.status(409).send({ error: '该 Feed URL 已存在' });
      }
      throw err;
    }
  });

  app.patch('/api/v1/rss-feeds/:id', {
    schema: { tags: ['rss-feeds'] },
  }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as UpdateRssFeedInput;

    const existing = await query('SELECT * FROM rss_feeds WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return reply.status(404).send({ error: 'RSS Feed 不存在' });
    }

    const row = existing.rows[0] as { is_builtin: boolean };

    if (row.is_builtin && (body.name !== undefined || body.language !== undefined)) {
      return reply.status(400).send({ error: '系统内置 Feed 仅可启用或停用' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (body.name !== undefined) {
      const name = normalizeName(body.name);
      if (!name) {
        return reply.status(400).send({ error: 'Feed 名称不能为空' });
      }
      updates.push(`name = $${idx++}`);
      values.push(name);
    }

    if (body.enabled !== undefined) {
      updates.push(`enabled = $${idx++}`);
      values.push(Boolean(body.enabled));
    }

    if (body.language !== undefined) {
      updates.push(`language = $${idx++}`);
      values.push(normalizeLanguage(body.language));
    }

    if (body.fetchIntervalMinutes !== undefined) {
      const interval = normalizeFeedInterval(body.fetchIntervalMinutes);
      if (interval === undefined) {
        return reply.status(400).send({ error: '无效的 RSS 采集间隔' });
      }
      updates.push(`fetch_interval_minutes = $${idx++}`);
      values.push(interval);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: '没有可更新的字段' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const res = await query(
      `UPDATE rss_feeds SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    return { feed: mapRssFeed(res.rows[0]) };
  });

  app.delete('/api/v1/rss-feeds/:id', {
    schema: { tags: ['rss-feeds'] },
  }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const { id } = req.params as { id: string };

    const existing = await query<{ is_builtin: boolean }>(
      'SELECT is_builtin FROM rss_feeds WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      return reply.status(404).send({ error: 'RSS Feed 不存在' });
    }

    if (existing.rows[0].is_builtin) {
      return reply.status(403).send({ error: '系统内置 Feed 不可删除，请使用停用' });
    }

    await query('DELETE FROM rss_feeds WHERE id = $1', [id]);

    return { success: true };
  });
}
