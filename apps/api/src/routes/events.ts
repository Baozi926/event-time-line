import type { FastifyInstance } from 'fastify';
import { query, recordTrackingHistory } from '@event-time-line/database';
import { mapArticle, mapEvent, mapSnapshot } from '../mappers.js';
import { requireAdmin } from '../auth/middleware.js';
import {
  EVENT_COUNT_FILTER_CLAUSE,
  EVENT_DOMINANT_JOINS,
  EVENT_LIST_FILTER_CLAUSE,
  mapFacetRows,
  parseEventFilterParams,
} from '../event-filter-sql.js';
import {
  ensureEventTopicClassifications,
  fallbackTopicFromCategoryHint,
  loadEventEmbeddingInfo,
  loadSimilarEvents,
} from '../services/candidate-insights.js';
import { loadEventDetailArticles } from '../services/event-articles.js';
import { generateEventEmbedding } from '../services/event-embedding.js';

const ARTICLE_COUNTRY = 'COALESCE(a.country_code, s.country_code)';
const MAX_DETAIL_ARTICLES = 50;

const TRACKING_BASE_FROM = `
  FROM events e
  ${EVENT_DOMINANT_JOINS}
  WHERE e.tracking_status = 'tracking'
`;

export async function eventRoutes(app: FastifyInstance) {
  app.get('/api/v1/events', {
    schema: {
      tags: ['events'],
      querystring: {
        type: 'object',
        properties: {
          sort: { type: 'string', enum: ['heat', 'recent', 'updated'] },
          category: { type: 'string' },
          country: { type: 'string', minLength: 2, maxLength: 2 },
          language: { type: 'string', minLength: 2, maxLength: 2 },
          limit: { type: 'integer', default: 20 },
          offset: { type: 'integer', default: 0 },
        },
      },
    },
  }, async (req) => {
    const {
      sort = 'heat',
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
      sort === 'recent'
        ? 'e.first_seen_at DESC'
        : sort === 'updated'
          ? 'e.last_updated_at DESC'
          : 'e.heat_score DESC, e.last_updated_at DESC';

    const [rows, count, categoryFacets, countryFacets, languageFacets] = await Promise.all([
      query(
        `SELECT e.*
         ${TRACKING_BASE_FROM}
         ${EVENT_LIST_FILTER_CLAUSE}
         ORDER BY ${orderBy}
         LIMIT $1 OFFSET $2`,
        [limit, offset, categoryFilter, countryFilter, languageFilter],
      ),
      query(
        `SELECT COUNT(*)::text AS count
         ${TRACKING_BASE_FROM}
         ${EVENT_COUNT_FILTER_CLAUSE}`,
        [categoryFilter, countryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT e.category_hint AS value, COUNT(*)::text AS count
         ${TRACKING_BASE_FROM}
         AND e.category_hint IS NOT NULL
         AND ($1::text IS NULL OR dominant.country_code = $1)
         AND ($2::text IS NULL OR dominant_lang.language_code = $2)
         GROUP BY e.category_hint
         ORDER BY COUNT(*) DESC`,
        [countryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT dominant.country_code AS value, COUNT(*)::text AS count
         ${TRACKING_BASE_FROM}
         AND dominant.country_code IS NOT NULL
         AND ($1::text IS NULL OR e.category_hint = $1)
         AND ($2::text IS NULL OR dominant_lang.language_code = $2)
         GROUP BY dominant.country_code
         ORDER BY COUNT(*) DESC`,
        [categoryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT dominant_lang.language_code AS value, COUNT(*)::text AS count
         ${TRACKING_BASE_FROM}
         AND dominant_lang.language_code IS NOT NULL
         AND ($1::text IS NULL OR e.category_hint = $1)
         AND ($2::text IS NULL OR dominant.country_code = $2)
         GROUP BY dominant_lang.language_code
         ORDER BY COUNT(*) DESC`,
        [categoryFilter, countryFilter],
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

  app.get('/api/v1/events/:slug', {
    schema: { tags: ['events'] },
  }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const userId = req.user?.id ?? null;
    const res = await query(
      `SELECT e.*,
              ($2::uuid IS NOT NULL AND EXISTS (
                SELECT 1
                FROM subscriptions sub
                WHERE sub.user_id = $2::uuid AND sub.event_id = e.id
              )) AS subscribed
       FROM events e
       WHERE e.slug = $1`,
      [slug, userId],
    );
    if (!res.rows[0]) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const event = mapEvent(res.rows[0]);
    const eventId = event.id;

    const [countryRes, articlesByEvent, topicRows, embedding] = await Promise.all([
      query<{ country_codes: string[] | null }>(
        `SELECT array_agg(DISTINCT cc ORDER BY cc) AS country_codes
         FROM (
           SELECT ${ARTICLE_COUNTRY} AS cc
           FROM event_articles ea
           JOIN articles a ON a.id = ea.article_id
           JOIN sources s ON s.id = a.source_id
           WHERE ea.event_id = $1 AND ${ARTICLE_COUNTRY} IS NOT NULL
         ) codes`,
        [eventId],
      ),
      loadEventDetailArticles([eventId], MAX_DETAIL_ARTICLES),
      ensureEventTopicClassifications(eventId),
      loadEventEmbeddingInfo(eventId),
    ]);

    let topicClassifications = topicRows;
    if (topicClassifications.length === 0) {
      const fallback = fallbackTopicFromCategoryHint(event.categoryHint);
      if (fallback) topicClassifications = [fallback];
    }

    let similarEvents: Awaited<ReturnType<typeof loadSimilarEvents>> = [];
    if (embedding.hasEmbedding) {
      similarEvents = await loadSimilarEvents(eventId);
    }

    const countryCodes = countryRes.rows[0]?.country_codes ?? undefined;
    const detailArticles = articlesByEvent.get(eventId);

    return {
      ...event,
      countryCodes: countryCodes?.length ? countryCodes : undefined,
      topicClassifications,
      embedding,
      similarEvents,
      detailArticles: detailArticles?.length ? detailArticles : undefined,
    };
  });

  app.post('/api/v1/events/:slug/generate-embedding', {
    schema: { tags: ['events'] },
  }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const { slug } = req.params as { slug: string };

    const event = await query<{ id: string }>(
      'SELECT id FROM events WHERE slug = $1',
      [slug],
    );
    if (!event.rows[0]) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const eventId = event.rows[0].id;
    const result = await generateEventEmbedding(eventId);
    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'disabled' || result.code === 'no_api_key'
            ? 400
            : 502;
      return reply.status(status).send({ error: result.message, code: result.code });
    }

    const embedding = await loadEventEmbeddingInfo(eventId);
    const similarEvents = await loadSimilarEvents(eventId);
    return { success: true, embedding, similarEvents };
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

  app.post('/api/v1/events/:slug/untrack', {
    schema: { tags: ['events'] },
  }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const { slug } = req.params as { slug: string };

    const event = await query<{ id: string; tracking_status: string }>(
      'SELECT id, tracking_status FROM events WHERE slug = $1',
      [slug],
    );
    if (!event.rows[0]) {
      return reply.status(404).send({ error: 'Event not found' });
    }
    if (event.rows[0].tracking_status !== 'tracking') {
      return reply.status(400).send({ error: 'Event is not being tracked' });
    }

    const eventId = event.rows[0].id;

    await query(
      `UPDATE events SET tracking_status = 'archived', updated_at = NOW() WHERE id = $1`,
      [eventId],
    );
    await query(
      `UPDATE event_queries SET is_active = FALSE, updated_at = NOW() WHERE event_id = $1`,
      [eventId],
    );
    await query(
      `UPDATE hotspot_candidates SET status = 'archived', updated_at = NOW()
       WHERE event_id = $1 AND status = 'promoted'`,
      [eventId],
    );

    await recordTrackingHistory(eventId, 'untracked', 'manual');

    return { success: true };
  });
}
