import { query, recordTrackingHistory } from '@event-time-line/database';

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

export async function promoteCandidateToTracking(
  candidateId: string,
): Promise<string | null> {
  const candidate = await query<{ event_id: string; title: string }>(
    'SELECT event_id, title FROM hotspot_candidates WHERE id = $1',
    [candidateId],
  );
  if (!candidate.rows[0]?.event_id) return null;

  const eventId = candidate.rows[0].event_id;
  const keywords = extractKeywords(candidate.rows[0].title);

  await query(
    `UPDATE events SET tracking_status = 'tracking', updated_at = NOW() WHERE id = $1`,
    [eventId],
  );

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
      [existing.rows[0].id, keywords, buildQuery(keywords)],
    );
  } else {
    await query(
      `INSERT INTO event_queries (event_id, keywords, gdelt_query) VALUES ($1, $2, $3)`,
      [eventId, keywords, buildQuery(keywords)],
    );
  }

  await query(
    `UPDATE hotspot_candidates SET status = 'promoted', updated_at = NOW() WHERE id = $1`,
    [candidateId],
  );

  await recordTrackingHistory(eventId, 'tracked', 'manual');

  return eventId;
}
