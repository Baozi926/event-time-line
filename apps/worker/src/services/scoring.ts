import { query } from '@event-time-line/database';
import { HEAT_WEIGHTS, PROMOTE_THRESHOLDS } from '@event-time-line/shared';

const TIER_SCORES: Record<string, number> = {
  tier1: 1.0,
  tier2: 0.7,
  tier3: 0.4,
  unknown: 0.3,
};

export async function updateEventStats(eventId: string): Promise<void> {
  await query(
    `UPDATE events SET
      article_count = (SELECT COUNT(*) FROM event_articles WHERE event_id = $1),
      source_count = (
        SELECT COUNT(DISTINCT a.source_id)
        FROM event_articles ea JOIN articles a ON a.id = ea.article_id
        WHERE ea.event_id = $1
      ),
      cover_image_url = COALESCE(
        (SELECT a.image_url FROM event_articles ea
         JOIN articles a ON a.id = ea.article_id
         WHERE ea.event_id = $1 AND a.image_url IS NOT NULL
         ORDER BY a.published_at DESC LIMIT 1),
        cover_image_url
      ),
      last_updated_at = NOW(),
      updated_at = NOW()
    WHERE id = $1`,
    [eventId],
  );
}

export async function calculateHeatScore(eventId: string): Promise<number> {
  const stats = await query<{
    source_count: number;
    last_updated_at: Date;
    articles_1h: string;
    articles_6h: string;
    countries: string;
    avg_tier: string;
  }>(
    `SELECT
      e.source_count,
      e.last_updated_at,
      (SELECT COUNT(*)::text FROM event_articles ea
       JOIN articles a ON a.id = ea.article_id
       WHERE ea.event_id = e.id AND a.published_at > NOW() - INTERVAL '1 hour') AS articles_1h,
      (SELECT COUNT(*)::text FROM event_articles ea
       JOIN articles a ON a.id = ea.article_id
       WHERE ea.event_id = e.id AND a.published_at > NOW() - INTERVAL '6 hours') AS articles_6h,
      (SELECT COUNT(DISTINCT s.country_code)::text FROM event_articles ea
       JOIN articles a ON a.id = ea.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE ea.event_id = e.id AND s.country_code IS NOT NULL) AS countries,
      (SELECT COALESCE(AVG(
         CASE s.credibility_tier
           WHEN 'tier1' THEN 1.0 WHEN 'tier2' THEN 0.7
           WHEN 'tier3' THEN 0.4 ELSE 0.3 END
       ), 0.3)::text FROM event_articles ea
       JOIN articles a ON a.id = ea.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE ea.event_id = e.id) AS avg_tier
    FROM events e WHERE e.id = $1`,
    [eventId],
  );

  const row = stats.rows[0];
  if (!row) return 0;

  const sourceDiversity = Math.min(row.source_count / 10, 1);
  const articles1h = parseInt(row.articles_1h, 10);
  const articles6h = parseInt(row.articles_6h, 10);
  const articleVelocity = articles1h / Math.max(articles6h, 1);
  const hoursSince =
    (Date.now() - new Date(row.last_updated_at).getTime()) / 3600000;
  const recencyDecay = Math.exp(-hoursSince / 24);
  const sourceTier = parseFloat(row.avg_tier);
  const geographicSpread = Math.min(parseInt(row.countries, 10) / 5, 1);

  const score =
    (sourceDiversity * HEAT_WEIGHTS.sourceDiversity +
      articleVelocity * HEAT_WEIGHTS.articleVelocity +
      recencyDecay * HEAT_WEIGHTS.recencyDecay +
      sourceTier * HEAT_WEIGHTS.sourceTier +
      geographicSpread * HEAT_WEIGHTS.geographicSpread) *
    100;

  return Math.round(score * 100) / 100;
}

export async function scoreAllCandidates(): Promise<number> {
  const candidates = await query<{ id: string }>(
    `SELECT id FROM events WHERE tracking_status = 'candidate'`,
  );

  for (const { id } of candidates.rows) {
    const heat = await calculateHeatScore(id);
    await query('UPDATE events SET heat_score = $1, updated_at = NOW() WHERE id = $2', [
      heat,
      id,
    ]);
    await query(
      `UPDATE hotspot_candidates SET heat_score = $1, updated_at = NOW()
       WHERE event_id = $2`,
      [heat, id],
    );
  }

  return candidates.rows.length;
}

export async function promoteEligibleEvents(): Promise<number> {
  const eligible = await query<{ id: string; title: string }>(
    `SELECT e.id, e.title FROM events e
     WHERE e.tracking_status = 'candidate'
       AND e.source_count >= $1
       AND e.heat_score >= $2
       AND (
         SELECT COUNT(*) FROM event_articles ea
         JOIN articles a ON a.id = ea.article_id
         WHERE ea.event_id = e.id AND a.published_at > NOW() - INTERVAL '24 hours'
       ) >= $3`,
    [
      PROMOTE_THRESHOLDS.minSourceCount,
      PROMOTE_THRESHOLDS.minHeatScore,
      PROMOTE_THRESHOLDS.minArticleCount24h,
    ],
  );

  let promoted = 0;
  for (const row of eligible.rows) {
    await query(
      `UPDATE events SET tracking_status = 'tracking', updated_at = NOW() WHERE id = $1`,
      [row.id],
    );

    const keywords = extractKeywords(row.title);
    const existing = await query(
      'SELECT 1 FROM event_queries WHERE event_id = $1',
      [row.id],
    );
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO event_queries (event_id, keywords, gdelt_query)
         VALUES ($1, $2, $3)`,
        [row.id, keywords, buildQuery(keywords)],
      );
    }

    await query(
      `UPDATE hotspot_candidates SET status = 'promoted', updated_at = NOW()
       WHERE event_id = $1`,
      [row.id],
    );

    promoted++;
  }

  return promoted;
}

export async function archiveStaleEvents(): Promise<number> {
  const res = await query(
    `UPDATE events SET tracking_status = 'archived', updated_at = NOW()
     WHERE tracking_status = 'tracking'
       AND last_updated_at < NOW() - INTERVAL '7 days'
     RETURNING id`,
  );
  return res.rowCount ?? 0;
}

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
