import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import { mapArticle, mapEvent, mapSnapshot } from '../mappers.js';

export async function eventRoutes(app: FastifyInstance) {
  app.get('/api/v1/events', {
    schema: {
      tags: ['events'],
      querystring: {
        type: 'object',
        properties: {
          sort: { type: 'string', enum: ['heat', 'recent', 'updated'] },
          limit: { type: 'integer', default: 20 },
          offset: { type: 'integer', default: 0 },
        },
      },
    },
  }, async (req) => {
    const { sort = 'heat', limit = 20, offset = 0 } = req.query as {
      sort?: string;
      limit?: number;
      offset?: number;
    };

    const orderBy =
      sort === 'recent'
        ? 'first_seen_at DESC'
        : sort === 'updated'
          ? 'last_updated_at DESC'
          : 'heat_score DESC, last_updated_at DESC';

    const [rows, count] = await Promise.all([
      query(`SELECT * FROM events WHERE tracking_status = 'tracking' ORDER BY ${orderBy} LIMIT $1 OFFSET $2`, [
        limit,
        offset,
      ]),
      query(`SELECT COUNT(*)::text AS count FROM events WHERE tracking_status = 'tracking'`),
    ]);

    return {
      events: rows.rows.map(mapEvent),
      total: parseInt(count.rows[0].count as string, 10),
      limit,
      offset,
    };
  });

  app.get('/api/v1/events/:slug', {
    schema: { tags: ['events'] },
  }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const res = await query('SELECT * FROM events WHERE slug = $1', [slug]);
    if (!res.rows[0]) {
      return reply.status(404).send({ error: 'Event not found' });
    }
    return mapEvent(res.rows[0]);
  });

  app.get('/api/v1/events/:slug/articles', {
    schema: { tags: ['events'] },
  }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const event = await query('SELECT id FROM events WHERE slug = $1', [slug]);
    if (!event.rows[0]) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const articles = await query(
      `SELECT a.*, s.name AS source_name, s.domain AS source_domain, s.credibility_tier
       FROM event_articles ea
       JOIN articles a ON a.id = ea.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE ea.event_id = $1
       ORDER BY a.published_at DESC`,
      [event.rows[0].id],
    );

    return { articles: articles.rows.map(mapArticle) };
  });

  app.get('/api/v1/events/:slug/snapshots', {
    schema: { tags: ['events'] },
  }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const event = await query('SELECT id FROM events WHERE slug = $1', [slug]);
    if (!event.rows[0]) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const snapshots = await query(
      `SELECT * FROM event_daily_snapshots WHERE event_id = $1 ORDER BY snapshot_date DESC`,
      [event.rows[0].id],
    );

    return { snapshots: snapshots.rows.map(mapSnapshot) };
  });
}
