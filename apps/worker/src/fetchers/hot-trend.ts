import {
  getEnabledHotTrendPlatforms,
  type HotTrendPlatformConfig,
  type HotTrendSourceSettings,
} from '@event-time-line/shared';
import type { RawArticle } from '@event-time-line/shared';
import { extractDomain, sleep } from '../utils.js';
import { loadDataSourcesSettings } from '../services/data-sources-settings.js';

interface NewsNowItem {
  id?: string;
  title?: string;
  url?: string;
  mobileUrl?: string;
}

interface NewsNowResponse {
  status?: string;
  id?: string;
  updatedTime?: number;
  items?: NewsNowItem[];
}

export interface HotTrendPlatformResult {
  platform: string;
  platformName: string;
  articles: RawArticle[];
  error?: string;
}

export async function isHotTrendEnabled(): Promise<boolean> {
  const { settings } = await loadDataSourcesSettings();
  return settings.hotTrend.enabled;
}

function checkDomainSafety(items: NewsNowItem[], expectedDomain: string): string | null {
  const expected = expectedDomain.toLowerCase().trim();
  if (!expected) return null;

  for (const item of items) {
    for (const field of ['url', 'mobileUrl'] as const) {
      const raw = item[field];
      if (!raw) continue;
      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        return `${raw} (invalid URL)`;
      }
      if (parsed.protocol !== 'https:') {
        return `${raw} (non-HTTPS)`;
      }
      const hostname = parsed.hostname.toLowerCase();
      if (hostname !== expected && !hostname.endsWith(`.${expected}`)) {
        return `${hostname} (from ${raw})`;
      }
    }
  }
  return null;
}

async function fetchPlatform(
  platform: HotTrendPlatformConfig,
  apiBaseUrl: string,
  maxRetries = 2,
): Promise<{ items: NewsNowItem[]; updatedAt: string }> {
  const url = `${apiBaseUrl}?id=${encodeURIComponent(platform.id)}&latest`;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as NewsNowResponse;
      const status = data.status ?? 'unknown';
      if (status !== 'success' && status !== 'cache') {
        throw new Error(`unexpected status: ${status}`);
      }

      const items = data.items ?? [];
      const unsafe = checkDomainSafety(items, platform.expectedDomain);
      if (unsafe) {
        throw new Error(
          `domain safety check failed (expected *.${platform.expectedDomain}): ${unsafe}`,
        );
      }

      const updatedAt = data.updatedTime
        ? new Date(data.updatedTime).toISOString()
        : new Date().toISOString();

      return { items, updatedAt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep((attempt + 1) * 2000);
      }
    }
  }

  throw lastError ?? new Error(`hot-trend fetch failed: ${platform.id}`);
}

function mapItemsToArticles(
  platform: HotTrendPlatformConfig,
  items: NewsNowItem[],
  publishedAt: string,
  fetchedAt: string,
): RawArticle[] {
  const articles: RawArticle[] = [];
  const seenTitles = new Set<string>();

  items.forEach((item, index) => {
    const title = item.title?.trim();
    if (!title || seenTitles.has(title)) return;
    seenTitles.add(title);

    const link = item.url?.trim() || item.mobileUrl?.trim();
    if (!link) return;

    const rank = index + 1;
    articles.push({
      sourceType: 'hot_trend',
      externalId: `${platform.id}:${item.id ?? link}`,
      url: link,
      title,
      domain: extractDomain(link) || platform.expectedDomain,
      language: platform.language,
      country: platform.countryCode,
      publishedAt,
      snippet: `${platform.name} #${rank}`,
      categoryHint: platform.id,
      fetchedAt,
    });
  });

  return articles;
}

export async function fetchAllHotTrends(
  hotTrendSettings?: HotTrendSourceSettings,
): Promise<HotTrendPlatformResult[]> {
  const { settings } = await loadDataSourcesSettings();
  const config = hotTrendSettings ?? settings.hotTrend;

  if (!config.enabled) {
    console.log('[hot-trend] Skipped (disabled in data source settings)');
    return [];
  }

  const apiBaseUrl = config.apiUrl;
  const platforms = getEnabledHotTrendPlatforms(config);
  const results: HotTrendPlatformResult[] = [];
  const fetchedAt = new Date().toISOString();

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    try {
      const { items, updatedAt } = await fetchPlatform(platform, apiBaseUrl);
      const articles = mapItemsToArticles(platform, items, updatedAt, fetchedAt);
      results.push({
        platform: platform.id,
        platformName: platform.name,
        articles,
      });
      console.log(`[hot-trend] ${platform.name} → ${articles.length} items`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[hot-trend] ${platform.name} error:`, err);
      results.push({
        platform: platform.id,
        platformName: platform.name,
        articles: [],
        error: message,
      });
    }

    if (i < platforms.length - 1) {
      await sleep(config.requestIntervalMs);
    }
  }

  return results;
}
