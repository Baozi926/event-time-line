import { query } from '@event-time-line/database';
import { DEFAULT_RSS_FEEDS } from '@event-time-line/shared';

export interface RssFeedRow {
  id?: string;
  name: string;
  url: string;
  domain: string;
  language: string;
  fetchIntervalMinutes?: number | null;
  lastFetchedAt?: string | null;
}

export async function loadEnabledRssFeeds(): Promise<RssFeedRow[]> {
  try {
    const res = await query<{
      id: string;
      name: string;
      url: string;
      domain: string;
      language: string;
      fetch_interval_minutes: number | null;
      last_fetched_at: Date | null;
    }>(
      `SELECT id::text AS id, name, url, domain, language,
              fetch_interval_minutes, last_fetched_at
       FROM rss_feeds
       WHERE enabled = TRUE
       ORDER BY sort_order, created_at`,
    );
    if (res.rows.length > 0) {
      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        url: row.url,
        domain: row.domain,
        language: row.language,
        fetchIntervalMinutes: row.fetch_interval_minutes,
        lastFetchedAt: row.last_fetched_at?.toISOString() ?? null,
      }));
    }
  } catch (err) {
    console.warn('Failed to load RSS feeds from DB, using defaults:', err);
  }

  return DEFAULT_RSS_FEEDS.map((feed) => ({
    name: feed.name,
    url: feed.url,
    domain: feed.domain,
    language: feed.language,
    fetchIntervalMinutes: null,
    lastFetchedAt: null,
  }));
}

export async function touchRssFeedFetchedAt(feedId: string): Promise<void> {
  await query(
    `UPDATE rss_feeds SET last_fetched_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [feedId],
  );
}

export async function loadAllRssFeeds(): Promise<
  Array<RssFeedRow & { enabled: boolean }>
> {
  try {
    const res = await query<RssFeedRow & { enabled: boolean }>(
      `SELECT id::text AS id, name, url, domain, language, enabled
       FROM rss_feeds
       ORDER BY sort_order, created_at`,
    );
    if (res.rows.length > 0) return res.rows;
  } catch (err) {
    console.warn('Failed to load RSS feeds from DB:', err);
  }

  return DEFAULT_RSS_FEEDS.map((feed) => ({
    name: feed.name,
    url: feed.url,
    domain: feed.domain,
    language: feed.language,
    enabled: true,
  }));
}
