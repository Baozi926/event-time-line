import { GDELT_CATEGORIES } from '@event-time-line/shared';
import type { RawArticle } from '@event-time-line/shared';
import { extractDomain, parseGdeltDate } from '../utils.js';

const GDELT_URL =
  process.env.GDELT_DOC_URL ??
  'https://api.gdeltproject.org/api/v2/doc/doc';

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
  sourcecountry?: string;
  socialimage?: string;
}

export async function fetchGdeltCategory(
  category: string,
  query: string,
  timespan = '24h',
): Promise<RawArticle[]> {
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: '75',
    format: 'json',
    timespan,
    sort: 'datedesc',
  });

  const res = await fetch(`${GDELT_URL}?${params}`, {
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`GDELT fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { articles?: GdeltArticle[] };
  const now = new Date().toISOString();

  return (data.articles ?? []).map((a) => ({
    sourceType: 'gdelt_doc' as const,
    externalId: a.url,
    url: a.url,
    title: a.title?.trim() ?? 'Untitled',
    domain: a.domain || extractDomain(a.url),
    language: a.language?.slice(0, 2).toLowerCase() ?? 'en',
    country: a.sourcecountry,
    publishedAt: parseGdeltDate(a.seendate).toISOString(),
    imageUrl: a.socialimage,
    categoryHint: category,
    fetchedAt: now,
  }));
}

export async function fetchAllGdelt(): Promise<{
  category: string;
  articles: RawArticle[];
}[]> {
  const results: { category: string; articles: RawArticle[] }[] = [];

  for (const [category, query] of Object.entries(GDELT_CATEGORIES)) {
    try {
      const articles = await fetchGdeltCategory(category, query);
      results.push({ category, articles });
      await sleep(2000);
    } catch (err) {
      console.error(`GDELT fetch error [${category}]:`, err);
      results.push({ category, articles: [] });
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
