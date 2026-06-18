import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import type { HotspotCandidate } from '@event-time-line/shared';
import { mapCandidate } from '../mappers.js';
import { loadEventDetailArticles } from '../services/event-articles.js';
import { mapFacetRows } from '../event-filter-sql.js';
import { requireAdmin } from '../auth/middleware.js';
import {
  fallbackTopicFromCategoryHint,
  ensureEventTopicClassifications,
  loadEventEmbeddingInfo,
  loadSimilarEvents,
} from '../services/candidate-insights.js';
import { generateEventEmbedding } from '../services/event-embedding.js';

const MAX_ARTICLES_LIST = 5;
const MAX_ARTICLES_DETAIL = 50;

const ARTICLE_COUNTRY = 'COALESCE(a.country_code, s.country_code)';

const CANDIDATE_BASE_FROM = `
  FROM hotspot_candidates hc
  JOIN events e ON e.id = hc.event_id
  LEFT JOIN LATERAL (
    SELECT ${ARTICLE_COUNTRY} AS country_code
    FROM event_articles ea
    JOIN articles a ON a.id = ea.article_id
    JOIN sources s ON s.id = a.source_id
    WHERE ea.event_id = e.id AND ${ARTICLE_COUNTRY} IS NOT NULL
    GROUP BY ${ARTICLE_COUNTRY}
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) dominant ON true
  LEFT JOIN LATERAL (
    SELECT lower(left(a.language, 2)) AS language_code
    FROM event_articles ea
    JOIN articles a ON a.id = ea.article_id
    WHERE ea.event_id = e.id AND a.language IS NOT NULL AND trim(a.language) <> ''
    GROUP BY lower(left(a.language, 2))
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) dominant_lang ON true
  WHERE hc.status = 'open' AND e.tracking_status = 'candidate'
`;

function attachArticles(
  candidates: HotspotCandidate[],
  articlesByEvent: Map<string, CandidateArticleSummary[]>,
): HotspotCandidate[] {
  return candidates.map((c) => {
    if (!c.eventId) return c;
    const articles = articlesByEvent.get(c.eventId);
    return articles?.length ? { ...c, articles } : c;
  });
}

export async function candidateRoutes(app: FastifyInstance) {
  app.get('/api/v1/candidates', {
    schema: {
      tags: ['candidates'],
      querystring: {
        type: 'object',
        properties: {
          sort: { type: 'string', enum: ['heat', 'recent', 'updated'] },
          category: { type: 'string' },
          country: { type: 'string', minLength: 2, maxLength: 2 },
          language: { type: 'string', minLength: 2, maxLength: 2 },
          limit: { type: 'integer', default: 30 },
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
      limit = 30,
      offset = 0,
    } = req.query as {
      sort?: string;
      category?: string;
      country?: string;
      language?: string;
      limit?: number;
      offset?: number;
    };

    const categoryFilter = category || null;
    const countryFilter = country?.toUpperCase() || null;
    const languageFilter = language?.toLowerCase().slice(0, 2) || null;
    const orderBy =
      sort === 'recent'
        ? 'hc.first_seen_at DESC'
        : sort === 'updated'
          ? 'hc.last_seen_at DESC'
          : 'hc.heat_score DESC, hc.last_seen_at DESC';
    const userId = req.user?.id ?? null;

    const listFilterClause = `
      AND ($3::text IS NULL OR hc.category_hint = $3)
      AND ($4::text IS NULL OR dominant.country_code = $4)
      AND ($5::text IS NULL OR dominant_lang.language_code = $5)
    `;
    const countFilterClause = `
      AND ($1::text IS NULL OR hc.category_hint = $1)
      AND ($2::text IS NULL OR dominant.country_code = $2)
      AND ($3::text IS NULL OR dominant_lang.language_code = $3)
    `;

    const [rows, count, categoryFacets, countryFacets, languageFacets] = await Promise.all([
      query(
        `SELECT hc.*,
                e.slug AS event_slug,
                e.summary AS event_summary,
                dominant.country_code AS primary_country_code,
                dominant_lang.language_code AS primary_language_code,
                ($6::uuid IS NOT NULL AND EXISTS (
                  SELECT 1
                  FROM subscriptions sub
                  WHERE sub.user_id = $6::uuid AND sub.event_id = e.id
                )) AS subscribed,
                (
                  SELECT array_agg(DISTINCT cc ORDER BY cc)
                  FROM (
                    SELECT ${ARTICLE_COUNTRY} AS cc
                    FROM event_articles ea
                    JOIN articles a ON a.id = ea.article_id
                    JOIN sources s ON s.id = a.source_id
                    WHERE ea.event_id = e.id AND ${ARTICLE_COUNTRY} IS NOT NULL
                  ) codes
                ) AS country_codes
         ${CANDIDATE_BASE_FROM}
         ${listFilterClause}
         ORDER BY ${orderBy}
         LIMIT $1 OFFSET $2`,
        [limit, offset, categoryFilter, countryFilter, languageFilter, userId],
      ),
      query(
        `SELECT COUNT(*)::text AS count
         ${CANDIDATE_BASE_FROM}
         ${countFilterClause}`,
        [categoryFilter, countryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT hc.category_hint AS value, COUNT(*)::text AS count
         ${CANDIDATE_BASE_FROM}
         AND hc.category_hint IS NOT NULL
         AND ($1::text IS NULL OR dominant.country_code = $1)
         AND ($2::text IS NULL OR dominant_lang.language_code = $2)
         GROUP BY hc.category_hint
         ORDER BY COUNT(*) DESC`,
        [countryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT dominant.country_code AS value, COUNT(*)::text AS count
         ${CANDIDATE_BASE_FROM}
         AND dominant.country_code IS NOT NULL
         AND ($1::text IS NULL OR hc.category_hint = $1)
         AND ($2::text IS NULL OR dominant_lang.language_code = $2)
         GROUP BY dominant.country_code
         ORDER BY COUNT(*) DESC`,
        [categoryFilter, languageFilter],
      ),
      query<{ value: string; count: string }>(
        `SELECT dominant_lang.language_code AS value, COUNT(*)::text AS count
         ${CANDIDATE_BASE_FROM}
         AND dominant_lang.language_code IS NOT NULL
         AND ($1::text IS NULL OR hc.category_hint = $1)
         AND ($2::text IS NULL OR dominant.country_code = $2)
         GROUP BY dominant_lang.language_code
         ORDER BY COUNT(*) DESC`,
        [categoryFilter, countryFilter],
      ),
    ]);

    const candidates = rows.rows.map(mapCandidate);
    const eventIds = candidates
      .map((c) => c.eventId)
      .filter((id): id is string => Boolean(id));
    const articlesByEvent = await loadEventDetailArticles(eventIds, MAX_ARTICLES_LIST);

    return {
      candidates: attachArticles(candidates, articlesByEvent),
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

  app.get('/api/v1/candidates/:id', {
    schema: { tags: ['candidates'] },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = req.user?.id ?? null;

    const rows = await query(
      `SELECT hc.*,
              e.slug AS event_slug,
              e.summary AS event_summary,
              dominant.country_code AS primary_country_code,
              dominant_lang.language_code AS primary_language_code,
              ($2::uuid IS NOT NULL AND EXISTS (
                SELECT 1
                FROM subscriptions sub
                WHERE sub.user_id = $2::uuid AND sub.event_id = e.id
              )) AS subscribed,
              (
                SELECT array_agg(DISTINCT cc ORDER BY cc)
                FROM (
                  SELECT ${ARTICLE_COUNTRY} AS cc
                  FROM event_articles ea
                  JOIN articles a ON a.id = ea.article_id
                  JOIN sources s ON s.id = a.source_id
                  WHERE ea.event_id = e.id AND ${ARTICLE_COUNTRY} IS NOT NULL
                ) codes
              ) AS country_codes
       ${CANDIDATE_BASE_FROM}
       AND hc.id = $1`,
      [id, userId],
    );

    if (!rows.rows[0]) {
      return reply.status(404).send({ error: 'Candidate not found' });
    }

    const candidate = mapCandidate(rows.rows[0]);
    if (candidate.eventId) {
      const [articlesByEvent, topics, embedding] = await Promise.all([
        loadEventDetailArticles([candidate.eventId], MAX_ARTICLES_DETAIL),
        ensureEventTopicClassifications(candidate.eventId),
        loadEventEmbeddingInfo(candidate.eventId),
      ]);
      const articles = articlesByEvent.get(candidate.eventId);
      if (articles?.length) {
        candidate.articles = articles;
      }
      if (topics.length > 0) {
        candidate.topics = topics;
      } else {
        const fallback = fallbackTopicFromCategoryHint(candidate.categoryHint);
        if (fallback) candidate.topics = [fallback];
      }
      candidate.embedding = embedding;
      if (embedding.hasEmbedding) {
        candidate.similarEvents = await loadSimilarEvents(candidate.eventId);
      }
    }

    return { candidate };
  });

  app.post('/api/v1/candidates/:id/generate-embedding', {
    schema: { tags: ['candidates'] },
  }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const { id } = req.params as { id: string };

    const candidate = await query<{ event_id: string }>(
      `SELECT hc.event_id
       ${CANDIDATE_BASE_FROM}
       AND hc.id = $1`,
      [id],
    );

    const eventId = candidate.rows[0]?.event_id;
    if (!eventId) {
      return reply.status(404).send({ error: 'Candidate not found' });
    }

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

  app.post('/api/v1/candidates/:id/archive', {
    schema: { tags: ['candidates'] },
  }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const { id } = req.params as { id: string };

    const candidate = await query<{ event_id: string }>(
      'SELECT event_id FROM hotspot_candidates WHERE id = $1',
      [id],
    );
    if (!candidate.rows[0]?.event_id) {
      return reply.status(404).send({ error: 'Candidate not found' });
    }

    await query(
      `UPDATE events SET tracking_status = 'archived', updated_at = NOW() WHERE id = $1`,
      [candidate.rows[0].event_id],
    );
    await query(
      `UPDATE hotspot_candidates SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [id],
    );

    return { success: true };
  });
}
