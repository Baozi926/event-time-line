import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import { mapEvent } from '../mappers.js';
import { requireUser } from '../auth/middleware.js';
import { promoteCandidateToTracking } from '../services/candidate-tracking.js';
import {
  EVENT_DOMINANT_JOINS,
  mapFacetRows,
  parseEventFilterParams,
} from '../event-filter-sql.js';

const SUBSCRIPTION_BASE_FROM = `
  FROM subscriptions sub
  JOIN events e ON e.id = sub.event_id
  ${EVENT_DOMINANT_JOINS}
  WHERE sub.user_id = $1
`;

export async function subscriptionRoutes(app: FastifyInstance) {
  app.get('/api/v1/me/subscriptions', {
    schema: {
      tags: ['subscriptions'],
      querystring: {
        type: 'object',
        properties: {
          sort: { type: 'string', enum: ['heat', 'recent', 'updated', 'subscribed'] },
          category: { type: 'string' },
          country: { type: 'string', minLength: 2, maxLength: 2 },
          language: { type: 'string', minLength: 2, maxLength: 2 },
          limit: { type: 'integer', default: 20 },
          offset: { type: 'integer', default: 0 },
        },
      },
    },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const {
      sort = 'subscribed',
      category,
      country,
      language,
      limit = 20,
      offset = 0,
    } = req.query as {
      sort?: string;
      category?: string;
      country?: string;
      language?: string;
      limit?: number;
      offset?: number;
    };

    const { categoryFilter, countryFilter, languageFilter } = parseEventFilterParams({
      category,
      country,
      language,
    });

    const orderBy =
      sort === 'heat'
        ? 'e.heat_score DESC, e.last_updated_at DESC'
        : sort === 'recent'
          ? 'e.first_seen_at DESC'
          : sort === 'updated'
            ? 'e.last_updated_at DESC'
            : 'sub.created_at DESC';

    const listFilterClause = `
      AND ($4::text IS NULL OR e.category_hint = $4)
      AND ($5::text IS NULL OR dominant.country_code = $5)
      AND ($6::text IS NULL OR dominant_lang.language_code = $6)
    `;
    const countFilterClause = `
      AND ($2::text IS NULL OR e.category_hint = $2)
      AND ($3::text IS NULL OR dominant.country_code = $3)
      AND ($4::text IS NULL OR dominant_lang.language_code = $4)
    `;

    const [rows, count, categoryFacets, countryFacets, languageFacets] = await Promise.all([
      query(
        `SELECT e.*
         ${SUBSCRIPTION_BASE_FROM}
         ${listFilterClause}
         ORDER BY ${orderBy}
         LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset, categoryFilter, countryFilter, languageFilter],
      ),
      query(
        `SELECT COUNT(*)::text AS count
         ${SUBSCRIPTION_BASE_FROM}
         ${countFilterClause}`,
        [req.user.id, categoryFilter, countryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT e.category_hint AS value, COUNT(*)::text AS count
         ${SUBSCRIPTION_BASE_FROM}
         AND e.category_hint IS NOT NULL
         AND ($2::text IS NULL OR dominant.country_code = $2)
         AND ($3::text IS NULL OR dominant_lang.language_code = $3)
         GROUP BY e.category_hint
         ORDER BY COUNT(*) DESC`,
        [req.user.id, countryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT dominant.country_code AS value, COUNT(*)::text AS count
         ${SUBSCRIPTION_BASE_FROM}
         AND dominant.country_code IS NOT NULL
         AND ($2::text IS NULL OR e.category_hint = $2)
         AND ($3::text IS NULL OR dominant_lang.language_code = $3)
         GROUP BY dominant.country_code
         ORDER BY COUNT(*) DESC`,
        [req.user.id, categoryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT dominant_lang.language_code AS value, COUNT(*)::text AS count
         ${SUBSCRIPTION_BASE_FROM}
         AND dominant_lang.language_code IS NOT NULL
         AND ($2::text IS NULL OR e.category_hint = $2)
         AND ($3::text IS NULL OR dominant.country_code = $3)
         GROUP BY dominant_lang.language_code
         ORDER BY COUNT(*) DESC`,
        [req.user.id, categoryFilter, countryFilter],
      ),
    ]);

    return {
      events: rows.rows.map(mapEvent),
      total: parseInt(count.rows[0].count as string, 10),
      limit,
      offset,
      facets: {
        categories: mapFacetRows(categoryFacets.rows),
        countries: mapFacetRows(countryFacets.rows),
        languages: mapFacetRows(languageFacets.rows),
      },
    };
  });

  app.get('/api/v1/me/subscriptions/ids', {
    schema: { tags: ['subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const res = await query<{ event_id: string }>(
      `SELECT event_id FROM subscriptions WHERE user_id = $1`,
      [req.user.id],
    );
    return { eventIds: res.rows.map((r) => r.event_id) };
  });

  app.post('/api/v1/me/subscriptions/:eventId', {
    schema: { tags: ['subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const { eventId } = req.params as { eventId: string };

    const event = await query('SELECT id FROM events WHERE id = $1', [eventId]);
    if (!event.rows[0]) {
      return reply.status(404).send({ error: '事件不存在' });
    }

    await query(
      `INSERT INTO subscriptions (user_id, event_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [req.user.id, eventId],
    );

    return { success: true, eventId };
  });

  app.post('/api/v1/me/subscriptions/from-candidate/:id', {
    schema: { tags: ['subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const { id } = req.params as { id: string };
    const eventId = await promoteCandidateToTracking(id);
    if (!eventId) {
      return reply.status(404).send({ error: '候选不存在或尚未关联事件' });
    }

    await query(
      `INSERT INTO subscriptions (user_id, event_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [req.user.id, eventId],
    );

    return { success: true, eventId };
  });

  app.delete('/api/v1/me/subscriptions/:eventId', {
    schema: { tags: ['subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const { eventId } = req.params as { eventId: string };

    await query(
      `DELETE FROM subscriptions WHERE user_id = $1 AND event_id = $2`,
      [req.user.id, eventId],
    );

    return { success: true };
  });
}
