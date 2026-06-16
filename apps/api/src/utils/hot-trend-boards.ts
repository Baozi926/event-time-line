import type {
  HotTrendItem,
  HotTrendPlatformBoard,
  HotTrendPlatformConfig,
} from '@event-time-line/shared';
import type { HotTrendPlatformResult } from '@event-time-line/worker/hot-trend';

function mapMetadataArticles(
  metadata: unknown,
): Array<{ title: string; url: string }> {
  if (!metadata || typeof metadata !== 'object') return [];
  const articles = (metadata as { articles?: unknown }).articles;
  if (!Array.isArray(articles)) return [];
  return articles.filter(
    (row): row is { title: string; url: string } =>
      row &&
      typeof row === 'object' &&
      typeof (row as { title?: unknown }).title === 'string' &&
      typeof (row as { url?: unknown }).url === 'string',
  );
}

export function boardsFromCollectionRuns(
  runs: Array<{
    category: string | null;
    status: string;
    error_message: string | null;
    metadata: unknown;
    finished_at: Date | null;
  }>,
  platforms: HotTrendPlatformConfig[],
): HotTrendPlatformBoard[] {
  const runByPlatform = new Map<string, typeof runs[number]>();
  for (const run of runs) {
    if (!run.category) continue;
    if (!runByPlatform.has(run.category)) {
      runByPlatform.set(run.category, run);
    }
  }

  return platforms.map((platform) => {
    const run = runByPlatform.get(platform.id);
    if (!run) {
      return {
        platformId: platform.id,
        platformName: platform.name,
        items: [],
      };
    }

    const articles = mapMetadataArticles(run.metadata);
    const items: HotTrendItem[] = articles.map((article, index) => ({
      rank: index + 1,
      title: article.title,
      url: article.url,
    }));

    return {
      platformId: platform.id,
      platformName: platform.name,
      updatedAt: run.finished_at?.toISOString(),
      items,
      error:
        items.length === 0 && run.status === 'failed'
          ? run.error_message ?? '采集失败'
          : undefined,
    };
  });
}

export function boardsFromLiveResults(
  results: HotTrendPlatformResult[],
  platforms: HotTrendPlatformConfig[],
): HotTrendPlatformBoard[] {
  const resultByPlatform = new Map(results.map((r) => [r.platform, r]));

  return platforms.map((platform) => {
    const result = resultByPlatform.get(platform.id);
    if (!result) {
      return {
        platformId: platform.id,
        platformName: platform.name,
        items: [],
      };
    }

    const items: HotTrendItem[] = result.articles.map((article, index) => ({
      rank: index + 1,
      title: article.title,
      url: article.url,
    }));

    return {
      platformId: platform.id,
      platformName: result.platformName || platform.name,
      updatedAt: result.articles[0]?.publishedAt,
      items,
      error: result.error,
    };
  });
}
