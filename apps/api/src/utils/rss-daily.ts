import type {
  CollectionRunRssFeedResult,
  RssCollectionDailySummary,
  RssFeedDailyStats,
} from '@event-time-line/shared';

function isRssFeedResult(value: unknown): value is CollectionRunRssFeedResult {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.feedName === 'string' &&
    typeof row.feedUrl === 'string' &&
    (row.status === 'completed' || row.status === 'failed' || row.status === 'skipped') &&
    typeof row.articlesFound === 'number'
  );
}

export function parseRssFeedResults(metadata: unknown): CollectionRunRssFeedResult[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const feeds = (metadata as { rssFeeds?: unknown }).rssFeeds;
  if (!Array.isArray(feeds)) return [];
  return feeds.filter(isRssFeedResult);
}

function emptyStats(
  feed: { id?: string; name: string; url: string; enabled: boolean },
): RssFeedDailyStats {
  return {
    feedId: feed.id,
    feedName: feed.name,
    feedUrl: feed.url,
    enabled: feed.enabled,
    todayRuns: 0,
    successCount: 0,
    failCount: 0,
    skippedCount: 0,
    todayArticlesFound: 0,
    todayArticlesNew: 0,
  };
}

export function buildRssDailySummary(
  feeds: Array<{ id: string; name: string; url: string; enabled: boolean }>,
  runs: Array<{
    startedAt: Date;
    status: string;
    metadata: unknown;
    articlesFound?: number;
    articlesNew?: number;
  }>,
  articleCountsByFeedUrl?: Map<string, { found: number; new: number }>,
): RssCollectionDailySummary {
  const statsMap = new Map<string, RssFeedDailyStats>();
  let todayArticlesNew = 0;

  for (const feed of feeds) {
    statsMap.set(feed.url, emptyStats(feed));
  }

  for (const run of runs) {
    const startedAt = run.startedAt.toISOString();
    todayArticlesNew += run.articlesNew ?? 0;
    const feedResults = parseRssFeedResults(run.metadata);

    if (feedResults.length === 0) {
      continue;
    }

    for (const result of feedResults) {
      let stat = statsMap.get(result.feedUrl);
      if (!stat) {
        stat = emptyStats({
          id: result.feedId,
          name: result.feedName,
          url: result.feedUrl,
          enabled: false,
        });
        statsMap.set(result.feedUrl, stat);
      }

      if (result.status === 'skipped') {
        stat.skippedCount += 1;
        stat.lastStatus = 'skipped';
        stat.lastAt = startedAt;
        stat.lastSkippedReason = result.skippedReason;
        continue;
      }

      stat.todayRuns += 1;
      if (result.status === 'completed') {
        stat.successCount += 1;
        stat.todayArticlesFound += result.articlesFound;
        stat.todayArticlesNew += result.articlesNew ?? 0;
      }
      if (result.status === 'failed') stat.failCount += 1;
      stat.lastStatus = result.status;
      stat.lastAt = startedAt;
      stat.lastArticlesFound = result.articlesFound;
      stat.lastError = result.errorMessage;
    }
  }

  if (articleCountsByFeedUrl) {
    for (const stat of statsMap.values()) {
      const db = articleCountsByFeedUrl.get(stat.feedUrl);
      if (!db) continue;
      stat.todayArticlesFound = Math.max(stat.todayArticlesFound, db.found);
      stat.todayArticlesNew = Math.max(stat.todayArticlesNew, db.new);
    }
  }

  const feedList = [...statsMap.values()].sort((a, b) =>
    a.feedName.localeCompare(b.feedName, 'zh-CN'),
  );

  const todayArticlesFound = feedList
    .filter((feed) => feed.enabled)
    .reduce((sum, feed) => sum + feed.todayArticlesFound, 0);

  if (todayArticlesNew === 0) {
    todayArticlesNew = feedList
      .filter((feed) => feed.enabled)
      .reduce((sum, feed) => sum + feed.todayArticlesNew, 0);
  }

  const today = new Date();
  const date = today.toLocaleDateString('sv-SE');

  return {
    date,
    pipelineRuns: runs.length,
    todayArticlesFound,
    todayArticlesNew,
    feeds: feedList,
  };
}

export type RssFeedArticleCounts = Map<string, { found: number; new: number }>;

export function mapRssArticleCountRows(
  rows: Array<{ feed_url: string; found: string; new_count: string }>,
): RssFeedArticleCounts {
  const map = new Map<string, { found: number; new: number }>();
  for (const row of rows) {
    map.set(row.feed_url, {
      found: parseInt(row.found, 10) || 0,
      new: parseInt(row.new_count, 10) || 0,
    });
  }
  return map;
}
