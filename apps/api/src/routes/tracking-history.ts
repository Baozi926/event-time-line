import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import { mapTrackingHistoryEntry } from '../mappers.js';

export async function trackingHistoryRoutes(app: FastifyInstance) {
  app.get('/api/v1/tracking/history', {
    schema: {
      tags: ['tracking'],
      querystring: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['tracked', 'untracked'] },
          limit: { type: 'integer', default: 30 },
          offset: { type: 'integer', default: 0 },
        },
      },
    },
  }, async (req) => {
    const {
      action,
      limit = 30,
      offset = 0,
    } = req.query as {
      action?: string;
      limit?: number;
      offset?: number;
    };

    const actionFilter = action || null;

    const [rows, count] = await Promise.all([
      query(
        `SELECT th.*,
                e.slug AS event_slug,
                e.title AS event_title,
                e.tracking_status AS event_tracking_status,
                e.heat_score AS event_heat_score,
                e.category_hint AS event_category_hint
         FROM tracking_history th
         JOIN events e ON e.id = th.event_id
         WHERE ($3::text IS NULL OR th.action::text = $3)
         ORDER BY th.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset, actionFilter],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM tracking_history th
         WHERE ($1::text IS NULL OR th.action::text = $1)`,
        [actionFilter],
      ),
    ]);

    return {
      entries: rows.rows.map(mapTrackingHistoryEntry),
      total: parseInt(count.rows[0].count, 10),
      limit,
      offset,
    };
  });
}
