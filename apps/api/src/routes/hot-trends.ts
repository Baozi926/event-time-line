import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { query, recordTrackingHistory } from '@event-time-line/database';
import {
  HOT_TREND_PLATFORMS,
  getEnabledHotTrendPlatforms,
} from '@event-time-line/shared';
import {
  fetchAllHotTrends,
  isHotTrendEnabled,
} from '@event-time-line/worker/hot-trend';
import { readDataSourcesSettings } from '../services/data-sources-settings.js';
import {
  boardsFromCollectionRuns,
  boardsFromLiveResults,
} from '../utils/hot-trend-boards.js';

function boardsHaveItems(
  boards: Array<{ items: unknown[] }>,
): boolean {
  return boards.some((board) => board.items.length > 0);
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80)
      .replace(/-+$/, '') || `event-${Date.now()}`
  );
}

function clusterKeyFromTitle(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 8)
    .sort()
    .join('-');
  return createHash('md5').update(words || title).digest('hex');
}

function extractKeywords(title: string): string[] {
  const words = title
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  if (words.length <= 1) {
    return [title.trim().slice(0, 80)].filter(Boolean);
  }

  return words.filter((w) => w.length > 1).slice(0, 6);
}

function buildQuery(keywords: string[]): string {
  if (keywords.length === 0) return '';
  if (keywords.length === 1) return `"${keywords[0]}"`;
  return `(${keywords.map((k) => `"${k}"`).join(' OR ')})`;
}

async function uniqueSlug(title: string): Promise<string> {
  let slug = slugify(title);
  const exists = await query('SELECT 1 FROM events WHERE slug = $1', [slug]);
  if (exists.rows.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  return slug;
}

async function ensureEventQuery(eventId: string, title: string): Promise<void> {
  const keywords = extractKeywords(title);
  const gdeltQuery = buildQuery(keywords);
  const existing = await query<{ id: string }>(
    'SELECT id FROM event_queries WHERE event_id = $1 LIMIT 1',
    [eventId],
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE event_queries
       SET is_active = TRUE,
           keywords = CASE WHEN cardinality(keywords) = 0 THEN $2 ELSE keywords END,
           gdelt_query = COALESCE(NULLIF(gdelt_query, ''), $3),
           updated_at = NOW()
       WHERE id = $1`,
      [existing.rows[0].id, keywords, gdeltQuery],
    );
    return;
  }

  await query(
    `INSERT INTO event_queries (event_id, keywords, gdelt_query)
     VALUES ($1, $2, $3)`,
    [eventId, keywords, gdeltQuery],
  );
}

async function trackEvent(eventId: string, title: string): Promise<void> {
  const event = await query<{ tracking_status: string }>(
    'SELECT tracking_status FROM events WHERE id = $1',
    [eventId],
  );
  const wasTracking = event.rows[0]?.tracking_status === 'tracking';

  await query(
    `UPDATE events
     SET tracking_status = 'tracking', updated_at = NOW()
     WHERE id = $1`,
    [eventId],
  );
  await ensureEventQuery(eventId, title);

  if (!wasTracking) {
    await recordTrackingHistory(eventId, 'tracked', 'manual');
  }
}

export async function hotTrendRoutes(app: FastifyInstance) {
  app.get('/api/v1/hot-trends', {
    schema: {
      tags: ['hot-trends'],
      querystring: {
        type: 'object',
        properties: {
          live: { type: 'boolean', default: false },
        },
      },
    },
  }, async (req) => {
    const { live = false } = req.query as { live?: boolean };
    const { settings } = await readDataSourcesSettings();
    const enabled = await isHotTrendEnabled();
    const platforms = getEnabledHotTrendPlatforms(settings.hotTrend);
    const fetchedAt = new Date().toISOString();

    if (!enabled) {
      return {
        boards: boardsFromCollectionRuns([], platforms),
        fetchedAt,
        source: 'cache' as const,
        enabled: false,
      };
    }

    if (live) {
      const results = await fetchAllHotTrends(settings.hotTrend);
      return {
        boards: boardsFromLiveResults(results, platforms),
        fetchedAt,
        source: 'live' as const,
        enabled: true,
      };
    }

    const runs = await query<{
      category: string | null;
      status: string;
      error_message: string | null;
      metadata: unknown;
      finished_at: Date | null;
    }>(
      `SELECT DISTINCT ON (category)
         category, status, error_message, metadata, finished_at
       FROM collection_runs
       WHERE run_type = 'fetch_hot_trend'
         AND category IS NOT NULL
       ORDER BY category, finished_at DESC NULLS LAST`,
    );

    const boards = boardsFromCollectionRuns(runs.rows, platforms);

    if (!boardsHaveItems(boards)) {
      const results = await fetchAllHotTrends(settings.hotTrend);
      return {
        boards: boardsFromLiveResults(results, platforms),
        fetchedAt: new Date().toISOString(),
        source: 'live' as const,
        enabled: true,
      };
    }

    return {
      boards,
      fetchedAt,
      source: 'cache' as const,
      enabled: true,
    };
  });

  app.post('/api/v1/hot-trends/track', {
    schema: {
      tags: ['hot-trends'],
      body: {
        type: 'object',
        required: ['platformId', 'title', 'url'],
        properties: {
          platformId: { type: 'string', minLength: 1 },
          platformName: { type: 'string' },
          title: { type: 'string', minLength: 1 },
          url: { type: 'string', minLength: 1 },
          rank: { type: 'integer', minimum: 1 },
        },
      },
    },
  }, async (req, reply) => {
    const body = req.body as {
      platformId: string;
      platformName?: string;
      title: string;
      url: string;
      rank?: number;
    };

    const title = body.title.trim().slice(0, 300);
    if (!title) {
      return reply.status(400).send({ error: 'Title is required' });
    }

    const platform = HOT_TREND_PLATFORMS.find((p) => p.id === body.platformId);
    const platformName = body.platformName?.trim() || platform?.name || body.platformId;
    const clusterKey = clusterKeyFromTitle(title);

    const candidate = await query<{ event_id: string | null }>(
      `SELECT event_id FROM hotspot_candidates
       WHERE cluster_key = $1 AND event_id IS NOT NULL
       LIMIT 1`,
      [clusterKey],
    );

    if (candidate.rows[0]?.event_id) {
      await trackEvent(candidate.rows[0].event_id, title);
      await query(
        `UPDATE hotspot_candidates
         SET status = 'promoted', last_seen_at = NOW(), updated_at = NOW()
         WHERE cluster_key = $1`,
        [clusterKey],
      );
      return { success: true, eventId: candidate.rows[0].event_id };
    }

    const existingEvent = await query<{ id: string }>(
      `SELECT id
       FROM events
       WHERE lower(title) = lower($1)
          OR similarity(title, $1) > 0.55
       ORDER BY CASE WHEN lower(title) = lower($1) THEN 1 ELSE similarity(title, $1) END DESC
       LIMIT 1`,
      [title],
    );

    if (existingEvent.rows[0]) {
      await trackEvent(existingEvent.rows[0].id, title);
      await query(
        `INSERT INTO hotspot_candidates (
           cluster_key, title, event_id, status, heat_score, article_count,
           source_count, first_seen_at, last_seen_at
         )
         VALUES ($1, $2, $3, 'promoted', $4, 0, 1, NOW(), NOW())
         ON CONFLICT (cluster_key) DO UPDATE SET
           status = 'promoted',
           event_id = COALESCE(hotspot_candidates.event_id, EXCLUDED.event_id),
           last_seen_at = NOW(),
           updated_at = NOW()`,
        [
          clusterKey,
          title,
          existingEvent.rows[0].id,
          Math.max(1, 101 - (body.rank ?? 100)),
        ],
      );
      return { success: true, eventId: existingEvent.rows[0].id };
    }

    const now = new Date().toISOString();
    const slug = await uniqueSlug(title);
    const heatScore = Math.max(1, 101 - (body.rank ?? 100));
    const created = await query<{ id: string }>(
      `INSERT INTO events (
         slug, title, summary, tracking_status, confidence, heat_score,
         article_count, source_count, first_seen_at, last_updated_at, raw_payload
       )
       VALUES ($1, $2, $3, 'tracking', 'medium', $4, 0, 1, $5, $5, $6::jsonb)
       RETURNING id`,
      [
        slug,
        title,
        `来自${platformName}的平台热榜，已加入关注并等待后续采集补充。`,
        heatScore,
        now,
        JSON.stringify({
          sourceType: 'hot_trend',
          platformId: body.platformId,
          platformName,
          url: body.url,
          rank: body.rank ?? null,
        }),
      ],
    );

    const eventId = created.rows[0].id;
    await ensureEventQuery(eventId, title);
    await query(
      `INSERT INTO hotspot_candidates (
         cluster_key, title, event_id, status, heat_score, article_count,
         source_count, first_seen_at, last_seen_at
       )
       VALUES ($1, $2, $3, 'promoted', $4, 0, 1, $5, $5)
       ON CONFLICT (cluster_key) DO UPDATE SET
         status = 'promoted',
         event_id = COALESCE(hotspot_candidates.event_id, EXCLUDED.event_id),
         last_seen_at = NOW(),
         updated_at = NOW()`,
      [clusterKey, title, eventId, heatScore, now],
    );
    await recordTrackingHistory(eventId, 'tracked', 'manual');

    return { success: true, eventId };
  });
}
