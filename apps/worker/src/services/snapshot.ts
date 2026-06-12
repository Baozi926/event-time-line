import { query } from '@event-time-line/database';
import { calculateHeatScore } from './scoring.js';

export async function createDailySnapshots(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const events = await query<{ id: string; title: string; summary: string }>(
    `SELECT id, title, summary FROM events WHERE tracking_status = 'tracking'`,
  );

  let count = 0;
  for (const event of events.rows) {
    const heat = await calculateHeatScore(event.id);

    const articles = await query<{
      title: string;
      url: string;
      name: string;
      published_at: Date;
    }>(
      `SELECT a.title, a.url, s.name, a.published_at
       FROM event_articles ea
       JOIN articles a ON a.id = ea.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE ea.event_id = $1
       ORDER BY a.published_at DESC
       LIMIT 10`,
      [event.id],
    );

    const new24h = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM event_articles ea
       JOIN articles a ON a.id = ea.article_id
       WHERE ea.event_id = $1 AND a.published_at > NOW() - INTERVAL '24 hours'`,
      [event.id],
    );

    const stats = await query<{ article_count: number; source_count: number }>(
      'SELECT article_count, source_count FROM events WHERE id = $1',
      [event.id],
    );

    const topHeadlines = articles.rows.slice(0, 5).map((a) => ({
      title: a.title,
      url: a.url,
      source: a.name,
    }));

    await query(
      `INSERT INTO event_daily_snapshots (
        event_id, snapshot_date, heat_score, article_count, source_count,
        new_articles_24h, summary, top_headlines
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (event_id, snapshot_date) DO UPDATE SET
        heat_score = EXCLUDED.heat_score,
        article_count = EXCLUDED.article_count,
        source_count = EXCLUDED.source_count,
        new_articles_24h = EXCLUDED.new_articles_24h,
        summary = EXCLUDED.summary,
        top_headlines = EXCLUDED.top_headlines`,
      [
        event.id,
        today,
        heat,
        stats.rows[0]?.article_count ?? 0,
        stats.rows[0]?.source_count ?? 0,
        parseInt(new24h.rows[0]?.count ?? '0', 10),
        event.summary,
        JSON.stringify(topHeadlines),
      ],
    );

    count++;
  }

  return count;
}
