import { query } from '@event-time-line/database';
import type { CandidateArticleSummary } from '@event-time-line/shared';
import { mapCandidateArticle } from '../mappers.js';

export async function loadEventDetailArticles(
  eventIds: string[],
  maxArticles = 50,
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
