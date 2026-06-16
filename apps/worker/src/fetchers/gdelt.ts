import type {
  GdeltSourceSettings,
} from '@event-time-line/shared';
import type { RawArticle } from '@event-time-line/shared';
import { extractDomain, parseGdeltDate, sleep, toIsoStringSafe } from '../utils.js';
import { loadDataSourcesSettings } from '../services/data-sources-settings.js';
import { getEnabledGdeltCategories } from '@event-time-line/shared';

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
  sourcecountry?: string;
  socialimage?: string;
}

export interface GdeltCategoryResult {
  category: string;
  articles: RawArticle[];
  error?: string;
}

async function fetchGdeltWithRetry(url: string, maxRetries = 4): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (res.ok) return res;

      if (res.status === 429 && attempt < maxRetries - 1) {
        const waitMs = (attempt + 1) * 10_000;
        console.warn(`GDELT rate limited, retry in ${waitMs}ms (attempt ${attempt + 1})`);
        await sleep(waitMs);
        continue;
      }

      throw new Error(`GDELT fetch failed: ${res.status} ${res.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await sleep((attempt + 1) * 5000);
        continue;
      }
    }
  }

  throw lastError ?? new Error('GDELT fetch failed');
}

export async function fetchGdeltCategory(
  category: string,
  query: string,
  timespan = '24h',
  apiUrl?: string,
): Promise<RawArticle[]> {
  const { settings } = await loadDataSourcesSettings();
  const baseUrl = apiUrl ?? settings.gdelt.apiUrl;

  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: '75',
    format: 'json',
    timespan,
    sort: 'datedesc',
  });

  const res = await fetchGdeltWithRetry(`${baseUrl}?${params}`);
  const text = await res.text();

  let data: { articles?: GdeltArticle[] };
  try {
    data = JSON.parse(text) as { articles?: GdeltArticle[] };
  } catch {
    throw new Error(
      `GDELT returned non-JSON: ${text.trim().slice(0, 160)}`,
    );
  }
  const now = new Date().toISOString();

  return (data.articles ?? []).map((a) => ({
    sourceType: 'gdelt_doc' as const,
    externalId: a.url,
    url: a.url,
    title: a.title?.trim() ?? 'Untitled',
    domain: a.domain || extractDomain(a.url),
    language: a.language?.slice(0, 2).toLowerCase() ?? 'en',
    country: a.sourcecountry,
    publishedAt: toIsoStringSafe(parseGdeltDate(a.seendate)),
    imageUrl: a.socialimage,
    categoryHint: category,
    fetchedAt: now,
  }));
}

export async function fetchAllGdelt(
  gdeltSettings?: GdeltSourceSettings,
): Promise<GdeltCategoryResult[]> {
  const { settings } = await loadDataSourcesSettings();
  const config = gdeltSettings ?? settings.gdelt;

  if (!config.enabled) {
    console.log('[gdelt] Skipped (disabled in data source settings)');
    return [];
  }

  const categories = getEnabledGdeltCategories(config);
  const results: GdeltCategoryResult[] = [];

  for (let i = 0; i < categories.length; i++) {
    const categoryConfig = categories[i];
    try {
      const articles = await fetchGdeltCategory(
        categoryConfig.key,
        categoryConfig.query,
        '24h',
        config.apiUrl,
      );
      results.push({ category: categoryConfig.key, articles });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`GDELT fetch error [${categoryConfig.key}]:`, err);
      results.push({ category: categoryConfig.key, articles: [], error: message });
    }

    if (i < categories.length - 1) {
      await sleep(config.categoryDelayMs);
    }
  }

  return results;
}

export async function fetchGdeltForQuery(
  gdeltQuery: string,
  timespan = '7d',
): Promise<RawArticle[]> {
  return fetchGdeltCategory('tracked', gdeltQuery, timespan);
}
