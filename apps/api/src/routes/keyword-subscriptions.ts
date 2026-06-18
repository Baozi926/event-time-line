import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import { resolveKeywordToTopicSlug } from '@event-time-line/shared';
import { mapEvent } from '../mappers.js';
import { requireUser } from '../auth/middleware.js';
import { EVENT_DOMINANT_JOINS } from '../event-filter-sql.js';
import {
  computeKeywordMatchesForEvent,
  freeKeywordTextMatchSql,
  getFreeTextKeywords,
  getTopicSlugsFromKeywords,
  keywordTopicMatchSql,
  mapClassificationsForEvent,
  resolveSubscribedKeywords,
  type ResolvedKeywordSubscription,
} from '../keyword-match.js';
import { embedQueryText, searchEventsByVector } from '../services/embedding-search.js';
import { readDataSourcesSettings } from '../services/data-sources-settings.js';
import { formatVectorForPg } from '@event-time-line/shared';

function normalizeKeyword(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase();
}

function validateKeyword(input: string): { keyword: string; normalized: string } | null {
  const keyword = input.trim().replace(/\s+/g, ' ');
  const normalized = normalizeKeyword(input);
  if (normalized.length < 2 || normalized.length > 80) return null;
  return { keyword, normalized };
}

function buildMatchWhereClause(
  topicSlugs: string[],
  freeNormalizedKeywords: string[],
  paramStartIndex = 1,
): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let index = paramStartIndex;

  if (topicSlugs.length > 0) {
    clauses.push(keywordTopicMatchSql(`$${index}`));
    params.push(topicSlugs);
    index += 1;
  }

  if (freeNormalizedKeywords.length > 0) {
    clauses.push(freeKeywordTextMatchSql(`$${index}`));
    params.push(freeNormalizedKeywords);
  }

  return {
    sql: clauses.length > 0 ? `(${clauses.join(' OR ')})` : 'FALSE',
    params,
  };
}

async function loadClassificationRows(
  eventIds: string[],
  topicSlugs: string[],
) {
  if (eventIds.length === 0 || topicSlugs.length === 0) return [];

  const res = await query<{
    event_id: string;
    slug: string;
    name: string;
    confidence: string;
    classification_reason: string | null;
  }>(
    `SELECT et.event_id, t.slug, t.name, et.confidence::text, et.classification_reason
     FROM event_topics et
     JOIN topics t ON t.id = et.topic_id
     WHERE et.event_id = ANY($1::uuid[])
       AND t.slug = ANY($2::text[])
       AND et.confidence >= 0.5`,
    [eventIds, topicSlugs],
  );

  return res.rows;
}

interface VectorKeywordHit {
  eventId: string;
  keyword: string;
  similarity: number;
  row: Record<string, unknown>;
}

async function searchByVectorKeywords(
  keywords: ResolvedKeywordSubscription[],
  options: {
    minSimilarity: number;
    limit: number;
    offset: number;
    orderBy: string;
  },
): Promise<{ hits: VectorKeywordHit[]; total: number } | null> {
  const hitMap = new Map<string, VectorKeywordHit>();

  for (const item of keywords) {
    const vector = await embedQueryText(item.keyword);
    if (!vector) continue;

    const { rows } = await searchEventsByVector(vector, {
      minSimilarity: options.minSimilarity,
      limit: options.limit + options.offset + 50,
      offset: 0,
      orderBy: options.orderBy,
    });

    for (const row of rows) {
      const eventId = row.id as string;
      const similarity = Number(row.similarity);
      const existing = hitMap.get(eventId);
      if (!existing || similarity > existing.similarity) {
        hitMap.set(eventId, {
          eventId,
          keyword: item.keyword,
          similarity,
          row,
        });
      }
    }
  }

  if (hitMap.size === 0) return null;

  const sorted = [...hitMap.values()].sort((a, b) => {
    if (b.similarity !== a.similarity) return b.similarity - a.similarity;
    const heatA = Number(a.row.heat_score ?? 0);
    const heatB = Number(b.row.heat_score ?? 0);
    return heatB - heatA;
  });

  const page = sorted.slice(options.offset, options.offset + options.limit);
  return { hits: page, total: sorted.length };
}

export async function keywordSubscriptionRoutes(app: FastifyInstance) {
  app.get('/api/v1/me/keyword-subscriptions', {
    schema: { tags: ['keyword-subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const rows = await query<{
      id: string;
      keyword: string;
      normalized_keyword: string;
      created_at: string;
    }>(
      `SELECT id, keyword, normalized_keyword, created_at
       FROM user_keyword_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    return {
      keywords: rows.rows.map((row) => ({
        id: row.id,
        keyword: row.keyword,
        normalizedKeyword: row.normalized_keyword,
        createdAt: row.created_at,
        mappedTopicSlug: resolveKeywordToTopicSlug(row.normalized_keyword),
      })),
    };
  });

  app.get('/api/v1/me/keyword-subscriptions/events', {
    schema: {
      tags: ['keyword-subscriptions'],
      querystring: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          sort: { type: 'string', enum: ['heat', 'recent', 'updated'] },
          limit: { type: 'integer', default: 20 },
          offset: { type: 'integer', default: 0 },
        },
      },
    },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const {
      keyword,
      sort = 'heat',
      limit = 20,
      offset = 0,
    } = req.query as {
      keyword?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    };

    const subscribed = await query<{ keyword: string; normalized_keyword: string }>(
      `SELECT keyword, normalized_keyword
       FROM user_keyword_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    const subscribedKeywords = subscribed.rows.map((row) => ({
      keyword: row.keyword,
      normalized: row.normalized_keyword,
    }));
    if (subscribedKeywords.length === 0) {
      return { events: [], total: 0, limit, offset, keyword };
    }

    const requested = keyword ? validateKeyword(keyword) : null;
    if (keyword && !requested) {
      return reply.status(400).send({ error: '关键词长度需为 2-80 个字符' });
    }

    const keywords = requested
      ? subscribedKeywords.filter((item) => item.normalized === requested.normalized)
      : subscribedKeywords;

    if (keywords.length === 0) {
      return { events: [], total: 0, limit, offset, keyword };
    }

    const resolvedKeywords = resolveSubscribedKeywords(keywords);
    const topicSlugs = getTopicSlugsFromKeywords(resolvedKeywords);
    const freeKeywords = getFreeTextKeywords(resolvedKeywords);
    const freeNormalizedKeywords = freeKeywords.map((item) => item.normalized);

    const orderBy =
      sort === 'recent'
        ? 'e.first_seen_at DESC'
        : sort === 'updated'
          ? 'e.last_updated_at DESC'
          : 'e.heat_score DESC, e.last_updated_at DESC';

    const { settings } = await readDataSourcesSettings();
    if (settings.embedding.enabled) {
      const vectorResult = await searchByVectorKeywords(resolvedKeywords, {
        minSimilarity: settings.embedding.minSimilarity,
        limit,
        offset,
        orderBy,
      });

      if (vectorResult && vectorResult.hits.length > 0) {
        const eventIds = vectorResult.hits.map((hit) => hit.eventId);
        const classificationRows = await loadClassificationRows(eventIds, topicSlugs);

        return {
          events: vectorResult.hits.map((hit) => {
            const topicClassifications = mapClassificationsForEvent(
              hit.eventId,
              classificationRows,
              resolvedKeywords,
            );
            const primaryTopic = topicClassifications[0];
            const classifications = [{
              keyword: hit.keyword,
              similarity: hit.similarity,
              topicSlug: primaryTopic?.topicSlug,
              topicName: primaryTopic?.topicName,
              confidence: primaryTopic?.confidence,
              reason: primaryTopic?.reason,
            }];

            return {
              ...mapEvent(hit.row),
              matchedKeywords: [hit.keyword],
              classifications,
            };
          }),
          total: vectorResult.total,
          limit,
          offset,
          keyword,
        };
      }
    }

    const countMatchWhere = buildMatchWhereClause(topicSlugs, freeNormalizedKeywords);
    const listMatchWhere = buildMatchWhereClause(topicSlugs, freeNormalizedKeywords, 3);

    const countBaseFrom = `
      FROM events e
      ${EVENT_DOMINANT_JOINS}
      WHERE e.tracking_status IN ('candidate', 'tracking')
        AND ${countMatchWhere.sql}
    `;

    const listBaseFrom = `
      FROM events e
      ${EVENT_DOMINANT_JOINS}
      WHERE e.tracking_status IN ('candidate', 'tracking')
        AND ${listMatchWhere.sql}
    `;

    const [rows, count] = await Promise.all([
      query(
        `SELECT e.* ${listBaseFrom} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
        [limit, offset, ...listMatchWhere.params],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count ${countBaseFrom}`,
        countMatchWhere.params,
      ),
    ]);

    const eventIds = rows.rows.map((row) => row.id as string);
    const classificationRows = await loadClassificationRows(eventIds, topicSlugs);

    return {
      events: rows.rows.map((row) => {
        const eventId = row.id as string;
        const classifications = mapClassificationsForEvent(
          eventId,
          classificationRows,
          resolvedKeywords,
        );

        return {
          ...mapEvent(row),
          matchedKeywords: classifications.map((item) => item.keyword),
          classifications,
        };
      }),
      total: parseInt(count.rows[0].count as string, 10),
      limit,
      offset,
      keyword,
    };
  });

  app.get('/api/v1/me/keyword-subscriptions/matches/:slug', {
    schema: { tags: ['keyword-subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const { slug } = req.params as { slug: string };

    const [eventRes, subscribed] = await Promise.all([
      query<{
        id: string;
        title: string;
        summary: string | null;
        category_hint: string | null;
        has_embedding: boolean;
      }>(
        `SELECT id, title, summary, category_hint, embedding IS NOT NULL AS has_embedding
         FROM events
         WHERE slug = $1`,
        [slug],
      ),
      query<{ keyword: string; normalized_keyword: string }>(
        `SELECT keyword, normalized_keyword
         FROM user_keyword_subscriptions
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [req.user.id],
      ),
    ]);

    if (!eventRes.rows[0]) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const event = eventRes.rows[0];
    const resolvedKeywords = resolveSubscribedKeywords(
      subscribed.rows.map((row) => ({
        keyword: row.keyword,
        normalized: row.normalized_keyword,
      })),
    );
    const topicSlugs = getTopicSlugsFromKeywords(resolvedKeywords);
    const classificationRows = await loadClassificationRows([event.id], topicSlugs);
    const classifications = mapClassificationsForEvent(
      event.id,
      classificationRows,
      resolvedKeywords,
    );

    const { settings } = await readDataSourcesSettings();
    const vectorMatches: Array<{
      keyword: string;
      similarity: number;
      topicSlug?: string;
      topicName?: string;
      confidence?: number;
      reason?: string;
    }> = [];

    if (settings.embedding.enabled && event.has_embedding) {
      for (const item of resolvedKeywords) {
        const vector = await embedQueryText(item.keyword);
        if (!vector) continue;

        const res = await query<{ similarity: string }>(
          `SELECT 1 - (embedding <=> $1::vector) AS similarity
           FROM events WHERE id = $2`,
          [formatVectorForPg(vector), event.id],
        );
        const similarity = Number(res.rows[0]?.similarity ?? 0);
        if (similarity >= settings.embedding.minSimilarity) {
          const topic = classifications.find((c) => c.keyword === item.keyword);
          vectorMatches.push({
            keyword: item.keyword,
            similarity,
            topicSlug: topic?.topicSlug,
            topicName: topic?.topicName,
            confidence: topic?.confidence,
            reason: topic?.reason,
          });
        }
      }
    }

    const matches = vectorMatches.length > 0
      ? vectorMatches.map((item) => ({
        keyword: item.keyword,
        topicSlug: item.topicSlug,
        topicName: item.topicName,
        confidence: item.confidence,
        reason: item.reason,
        similarity: item.similarity,
      }))
      : computeKeywordMatchesForEvent(
        {
          title: event.title,
          summary: event.summary,
          categoryHint: event.category_hint,
          classifications,
        },
        resolvedKeywords,
      );

    return { matches };
  });

  app.post('/api/v1/me/keyword-subscriptions', {
    schema: {
      tags: ['keyword-subscriptions'],
      body: {
        type: 'object',
        required: ['keyword'],
        properties: {
          keyword: { type: 'string', minLength: 2, maxLength: 80 },
        },
      },
    },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const { keyword } = req.body as { keyword?: string };
    const parsed = keyword ? validateKeyword(keyword) : null;
    if (!parsed) {
      return reply.status(400).send({ error: '关键词长度需为 2-80 个字符' });
    }

    await query(
      `INSERT INTO user_keyword_subscriptions (user_id, keyword, normalized_keyword)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword`,
      [req.user.id, parsed.keyword, parsed.normalized],
    );

    return {
      success: true,
      keyword: parsed.keyword,
      mappedTopicSlug: resolveKeywordToTopicSlug(parsed.normalized),
    };
  });

  app.delete('/api/v1/me/keyword-subscriptions/:id', {
    schema: { tags: ['keyword-subscriptions'] },
  }, async (req, reply) => {
    if (!requireUser(req, reply)) return;

    const { id } = req.params as { id: string };

    await query(
      `DELETE FROM user_keyword_subscriptions WHERE user_id = $1 AND id = $2`,
      [req.user.id, id],
    );

    return { success: true };
  });
}
