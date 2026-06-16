import type { FastifyInstance } from 'fastify';
import { query, recordTrackingHistory } from '@event-time-line/database';
import type { CandidateArticleSummary, HotspotCandidate } from '@event-time-line/shared';
import { mapCandidate, mapCandidateArticle } from '../mappers.js';
import { mapFacetRows } from '../event-filter-sql.js';

const MAX_ARTICLES_LIST = 5;
const MAX_ARTICLES_DETAIL = 50;

function extractKeywords(title: string): string[] {
  return title
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);
}

function buildQuery(keywords: string[]): string {
  if (keywords.length === 0) return '';
  if (keywords.length === 1) return `"${keywords[0]}"`;
  return `(${keywords.map((k) => `"${k}"`).join(' OR ')})`;
}

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

async function loadCandidateArticles(
  eventIds: string[],
  maxArticles = MAX_ARTICLES_LIST,
): Promise<Map<string, CandidateArticleSummary[]>> {
  if (eventIds.length === 0) return new Map();

  const res = await query(
    `SELECT * FROM (
       SELECT ea.event_id,
              a.id, a.title, a.url, a.snippet, a.language, a.published_at, a.category_hint,
              s.name AS source_name, s.domain AS source_domain, s.country_code,
              ROW_NUMBER() OVER (PARTITION BY ea.event_id ORDER BY a.published_at DESC) AS rn
       FROM event_articles ea
       JOIN articles a ON a.id = ea.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE ea.event_id = ANY($1::uuid[])
     ) ranked
     WHERE rn <= $2`,
    [eventIds, maxArticles],
  );

  const grouped = new Map<string, CandidateArticleSummary[]>();
  for (const row of res.rows) {
    const eventId = row.event_id as string;
    const list = grouped.get(eventId) ?? [];
    list.push(mapCandidateArticle(row));
    grouped.set(eventId, list);
  }
  return grouped;
}

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
      category,
      country,
      language,
      limit = 30,
      offset = 0,
    } = req.query as {
      category?: string;
      country?: string;
      language?: string;
      limit?: number;
      offset?: number;
    };

    const categoryFilter = category || null;
    const countryFilter = country?.toUpperCase() || null;
    const languageFilter = language?.toLowerCase().slice(0, 2) || null;

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
         ORDER BY hc.heat_score DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset, categoryFilter, countryFilter, languageFilter],
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
    const articlesByEvent = await loadCandidateArticles(eventIds);

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

    const rows = await query(
      `SELECT hc.*,
              e.slug AS event_slug,
              e.summary AS event_summary,
              dominant.country_code AS primary_country_code,
              dominant_lang.language_code AS primary_language_code,
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
      [id],
    );

    if (!rows.rows[0]) {
      return reply.status(404).send({ error: 'Candidate not found' });
    }

    const candidate = mapCandidate(rows.rows[0]);
    if (candidate.eventId) {
      const articlesByEvent = await loadCandidateArticles(
        [candidate.eventId],
        MAX_ARTICLES_DETAIL,
      );
      const articles = articlesByEvent.get(candidate.eventId);
      if (articles?.length) {
        candidate.articles = articles;
      }
    }

    return { candidate };
  });

  app.post('/api/v1/candidates/:id/track', {
    schema: { tags: ['candidates'] },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const candidate = await query<{ event_id: string; title: string }>(
      'SELECT event_id, title FROM hotspot_candidates WHERE id = $1',
      [id],
    );
    if (!candidate.rows[0]?.event_id) {
      return reply.status(404).send({ error: 'Candidate not found' });
    }

    const eventId = candidate.rows[0].event_id;
    const keywords = extractKeywords(candidate.rows[0].title);

    await query(
      `UPDATE events SET tracking_status = 'tracking', updated_at = NOW() WHERE id = $1`,
      [eventId],
    );

    const existing = await query('SELECT 1 FROM event_queries WHERE event_id = $1', [eventId]);
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO event_queries (event_id, keywords, gdelt_query) VALUES ($1, $2, $3)`,
        [eventId, keywords, buildQuery(keywords)],
      );
    }

    await query(
      `UPDATE hotspot_candidates SET status = 'promoted', updated_at = NOW() WHERE id = $1`,
      [id],
    );

    await recordTrackingHistory(eventId, 'tracked', 'manual');

    return { success: true, eventId };
  });

  app.post('/api/v1/candidates/:id/archive', {
    schema: { tags: ['candidates'] },
  }, async (req, reply) => {
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
