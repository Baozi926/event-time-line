import { query } from '@event-time-line/database';
import type { RawArticle } from '@event-time-line/shared';
import { clusterKeyFromTitle, slugify } from '../utils.js';
import { calculateHeatScore, updateEventStats } from './scoring.js';

/** USGS-style titles are location-specific; title similarity would merge distinct quakes. */
function isDistinctEarthquakeTitle(title: string): boolean {
  return /^M\d+(?:\.\d+)?\s+earthquake\s+[—-]/i.test(title.trim());
}

export async function clusterArticle(
  articleId: string,
  title: string,
  categoryHint?: string,
): Promise<string | null> {
  if (!isDistinctEarthquakeTitle(title)) {
    const similar = await query<{ id: string; similarity: number }>(
      `SELECT e.id, similarity(e.title, $1) AS similarity
       FROM events e
       WHERE e.tracking_status IN ('candidate', 'tracking')
         AND similarity(e.title, $1) > 0.25
       ORDER BY similarity DESC
       LIMIT 1`,
      [title],
    );

    if (similar.rows[0] && similar.rows[0].similarity > 0.35) {
      const eventId = similar.rows[0].id;
      await linkArticleToEvent(eventId, articleId);
      await updateEventStats(eventId);
      return eventId;
    }
  }

  const clusterKey = clusterKeyFromTitle(title);
  const candidate = await query<{ id: string; event_id: string | null }>(
    `SELECT id, event_id FROM hotspot_candidates WHERE cluster_key = $1`,
    [clusterKey],
  );

  if (candidate.rows[0]?.event_id) {
    await linkArticleToEvent(candidate.rows[0].event_id, articleId);
    await updateEventStats(candidate.rows[0].event_id);
    await query(
      `UPDATE hotspot_candidates SET last_seen_at = NOW(), article_count = article_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [candidate.rows[0].id],
    );
    return candidate.rows[0].event_id;
  }

  const now = new Date();
  let slug = slugify(title);
  const slugExists = await query('SELECT 1 FROM events WHERE slug = $1', [slug]);
  if (slugExists.rows.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const event = await query<{ id: string }>(
    `INSERT INTO events (
      slug, title, summary, tracking_status, category_hint,
      first_seen_at, last_updated_at
    ) VALUES ($1, $2, $3, 'candidate', $4, $5, $5)
    RETURNING id`,
    [
      slug,
      title.slice(0, 300),
      title.slice(0, 200),
      categoryHint ?? null,
      now.toISOString(),
    ],
  );

  const eventId = event.rows[0].id;
  await linkArticleToEvent(eventId, articleId);

  if (candidate.rows[0]) {
    await query(
      `UPDATE hotspot_candidates SET event_id = $1, last_seen_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [eventId, candidate.rows[0].id],
    );
  } else {
    await query(
      `INSERT INTO hotspot_candidates (
        cluster_key, title, category_hint, event_id, article_count, source_count,
        first_seen_at, last_seen_at
      ) VALUES ($1, $2, $3, $4, 1, 1, $5, $5)`,
      [clusterKey, title.slice(0, 300), categoryHint ?? null, eventId, now.toISOString()],
    );
  }

  await updateEventStats(eventId);
  const heat = await calculateHeatScore(eventId);
  await query('UPDATE events SET heat_score = $1 WHERE id = $2', [heat, eventId]);

  return eventId;
}

export async function clusterRawArticles(
  articles: RawArticle[],
  articleIds: string[],
): Promise<number> {
  let eventsTouched = 0;
  for (let i = 0; i < articles.length; i++) {
    const articleId = articleIds[i];
    if (!articleId) continue;
    const eventId = await clusterArticle(
      articleId,
      articles[i].title,
      articles[i].categoryHint,
    );
    if (eventId) eventsTouched++;
  }
  return eventsTouched;
}

async function linkArticleToEvent(
  eventId: string,
  articleId: string,
): Promise<void> {
  await query(
    `INSERT INTO event_articles (event_id, article_id, relevance_score)
     VALUES ($1, $2, 1.0)
     ON CONFLICT DO NOTHING`,
    [eventId, articleId],
  );
}
