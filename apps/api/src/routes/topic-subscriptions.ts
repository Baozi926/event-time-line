import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import { mapEvent } from '../mappers.js';
import { requireUser } from '../auth/middleware.js';
import { EVENT_DOMINANT_JOINS } from '../event-filter-sql.js';
import {
  buildTopicMatchSql,
  buildUserTopicsMatchSql,
  isValidTopicSlug,
  listAvailableTopics,
} from '../topic-match-sql.js';

export async function topicSubscriptionRoutes(app: FastifyInstance) {
  app.get('/api/v1/me/topic-subscriptions', {
    schema: { tags: ['topic-subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const rows = await query<{ topic_slug: string; created_at: string }>(
      `SELECT topic_slug, created_at
       FROM user_topic_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    const subscribedSlugs = new Set(rows.rows.map((r) => r.topic_slug));

    const topics = rows.rows.map((r) => {
      const available = listAvailableTopics(subscribedSlugs).find((t) => t.slug === r.topic_slug);
      return {
        slug: r.topic_slug,
        name: available?.name ?? r.topic_slug,
        nameEn: available?.nameEn,
        icon: available?.icon,
        subscribedAt: r.created_at,
      };
    });

    return {
      topics,
      available: listAvailableTopics(subscribedSlugs),
    };
  });

  app.get('/api/v1/me/topic-subscriptions/events', {
    schema: {
      tags: ['topic-subscriptions'],
      querystring: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          sort: { type: 'string', enum: ['heat', 'recent', 'updated'] },
          limit: { type: 'integer', default: 20 },
          offset: { type: 'integer', default: 0 },
        },
      },
    },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const {
      topic,
      sort = 'heat',
      limit = 20,
      offset = 0,
    } = req.query as {
      topic?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    };

    const subscribed = await query<{ topic_slug: string }>(
      `SELECT topic_slug FROM user_topic_subscriptions WHERE user_id = $1`,
      [req.user.id],
    );

    const subscribedSlugs = subscribed.rows.map((r) => r.topic_slug);
    if (subscribedSlugs.length === 0) {
      return { events: [], total: 0, limit, offset, topicSlug: topic };
    }

    const targetSlugs = topic && isValidTopicSlug(topic)
      ? subscribedSlugs.filter((s) => s === topic)
      : subscribedSlugs;

    if (targetSlugs.length === 0) {
      return { events: [], total: 0, limit, offset, topicSlug: topic };
    }

    const matchSql = topic && isValidTopicSlug(topic)
      ? buildTopicMatchSql(topic)
      : buildUserTopicsMatchSql(targetSlugs);

    if (!matchSql) {
      return { events: [], total: 0, limit, offset, topicSlug: topic };
    }

    const orderBy =
      sort === 'recent'
        ? 'e.first_seen_at DESC'
        : sort === 'updated'
          ? 'e.last_updated_at DESC'
          : 'e.heat_score DESC, e.last_updated_at DESC';

    const baseFrom = `
      FROM events e
      ${EVENT_DOMINANT_JOINS}
      WHERE e.tracking_status IN ('candidate', 'tracking')
        AND ${matchSql}
    `;

    const [rows, count] = await Promise.all([
      query(
        `SELECT e.* ${baseFrom} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count ${baseFrom}`,
        [],
      ),
    ]);

    return {
      events: rows.rows.map(mapEvent),
      total: parseInt(count.rows[0].count as string, 10),
      limit,
      offset,
      topicSlug: topic,
    };
  });

  app.post('/api/v1/me/topic-subscriptions/:topicSlug', {
    schema: { tags: ['topic-subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const { topicSlug } = req.params as { topicSlug: string };
    if (!isValidTopicSlug(topicSlug)) {
      return reply.status(400).send({ error: '不支持的主题' });
    }

    await query(
      `INSERT INTO user_topic_subscriptions (user_id, topic_slug)
       VALUES ($1, $2)
       ON CONFLICT (user_id, topic_slug) DO NOTHING`,
      [req.user.id, topicSlug],
    );

    return { success: true, topicSlug };
  });

  app.delete('/api/v1/me/topic-subscriptions/:topicSlug', {
    schema: { tags: ['topic-subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const { topicSlug } = req.params as { topicSlug: string };

    await query(
      `DELETE FROM user_topic_subscriptions WHERE user_id = $1 AND topic_slug = $2`,
      [req.user.id, topicSlug],
    );

    return { success: true };
  });
}
