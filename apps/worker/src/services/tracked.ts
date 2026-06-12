import { query } from '@event-time-line/database';
import { fetchGdeltForQuery } from '../fetchers/gdelt.js';
import { ingestArticles } from './articles.js';
import { updateEventStats, calculateHeatScore } from './scoring.js';

export async function collectTrackedEvents(): Promise<{
  events: number;
  newArticles: number;
}> {
  const tracked = await query<{ id: string; gdelt_query: string | null; keywords: string[] }>(
    `SELECT e.id, eq.gdelt_query, eq.keywords
     FROM events e
     JOIN event_queries eq ON eq.event_id = e.id AND eq.is_active = TRUE
     WHERE e.tracking_status = 'tracking'`,
  );

  let totalNew = 0;

  for (const event of tracked.rows) {
    const q = event.gdelt_query;
    if (!q) continue;

    try {
      const articles = await fetchGdeltForQuery(q, '7d');
      const { newCount, articleIds } = await ingestArticles(articles);

      for (let i = 0; i < articles.length; i++) {
        const articleId = articleIds[i];
        if (!articleId) continue;
        await query(
          `INSERT INTO event_articles (event_id, article_id, relevance_score)
           VALUES ($1, $2, 1.0) ON CONFLICT DO NOTHING`,
          [event.id, articleId],
        );
      }

      await updateEventStats(event.id);
      const heat = await calculateHeatScore(event.id);
      await query(
        `UPDATE events SET heat_score = $1, last_collected_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [heat, event.id],
      );

      totalNew += newCount;

      await query(
        `INSERT INTO collection_runs (run_type, source_type, event_id, status, articles_found, articles_new, finished_at)
         VALUES ('fetch_tracked', 'gdelt_doc', $1, 'completed', $2, $3, NOW())`,
        [event.id, articles.length, newCount],
      );

      await sleep(2000);
    } catch (err) {
      console.error(`Tracked collect error [${event.id}]:`, err);
      await query(
        `INSERT INTO collection_runs (run_type, source_type, event_id, status, error_message, finished_at)
         VALUES ('fetch_tracked', 'gdelt_doc', $1, 'failed', $2, NOW())`,
        [event.id, String(err)],
      );
    }
  }

  return { events: tracked.rows.length, newArticles: totalNew };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
