import { query } from '@event-time-line/database';
import type { CollectionRunArticle, RawArticle } from '@event-time-line/shared';
import { hashUrl, normalizeUrl } from '../utils.js';

const MAX_RUN_ARTICLES_IN_METADATA = 100;

export function buildRunArticlesMetadata(
  articles: RawArticle[],
  items: Array<{ id: string; isNew: boolean }>,
): { articles: CollectionRunArticle[] } {
  const combined: CollectionRunArticle[] = [];

  for (let i = 0; i < articles.length; i++) {
    const raw = articles[i];
    const item = items[i];
    if (!raw || !item) continue;
    combined.push({
      id: item.id,
      title: raw.title,
      url: raw.url,
      domain: raw.domain,
      isNew: item.isNew,
    });
  }

  return { articles: combined.slice(0, MAX_RUN_ARTICLES_IN_METADATA) };
}

const TIER_SCORES: Record<string, number> = {
  tier1: 1.0,
  tier2: 0.7,
  tier3: 0.4,
  unknown: 0.3,
};

function normalizeCountryCode(code?: string): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length === 2 ? trimmed : null;
}

/** Sources that publish worldwide events; country belongs on each article, not the source. */
const GLOBAL_SOURCE_DOMAINS = new Set(['earthquake.usgs.gov']);

export async function resolveSource(
  domain: string,
  name?: string,
  countryCode?: string,
): Promise<string> {
  const cleanDomain = domain.replace(/^www\./, '');
  const country = GLOBAL_SOURCE_DOMAINS.has(cleanDomain)
    ? null
    : normalizeCountryCode(countryCode);
  const existing = await query<{ id: string }>(
    'SELECT id FROM sources WHERE domain = $1',
    [cleanDomain],
  );
  if (existing.rows[0]) {
    if (country) {
      await query(
        `UPDATE sources SET country_code = COALESCE(country_code, $1) WHERE id = $2`,
        [country, existing.rows[0].id],
      );
    }
    return existing.rows[0].id;
  }

  const inserted = await query<{ id: string }>(
    `INSERT INTO sources (name, domain, country_code) VALUES ($1, $2, $3)
     ON CONFLICT (domain) DO UPDATE SET
       name = EXCLUDED.name,
       country_code = COALESCE(sources.country_code, EXCLUDED.country_code)
     RETURNING id`,
    [name ?? cleanDomain, cleanDomain, country],
  );
  return inserted.rows[0].id;
}

export async function ingestArticle(
  raw: RawArticle,
): Promise<{ id: string; isNew: boolean } | null> {
  const url = normalizeUrl(raw.url);
  const existing = await query<{ id: string }>(
    'SELECT id FROM articles WHERE url = $1',
    [url],
  );
  if (existing.rows[0]) {
    const country = normalizeCountryCode(raw.country);
    if (country) {
      await query(
        `UPDATE articles SET country_code = $1 WHERE id = $2 AND country_code IS NULL`,
        [country, existing.rows[0].id],
      );
    }
    if (raw.feedUrl) {
      await query(
        `UPDATE articles SET feed_url = $1 WHERE id = $2 AND feed_url IS NULL`,
        [raw.feedUrl, existing.rows[0].id],
      );
    }
    return { id: existing.rows[0].id, isNew: false };
  }

  const sourceId = await resolveSource(raw.domain, undefined, raw.country);
  const articleCountry = normalizeCountryCode(raw.country);
  const inserted = await query<{ id: string }>(
    `INSERT INTO articles (
      source_id, external_id, url, title, snippet, language,
      published_at, image_url, fetched_at, category_hint, country_code, feed_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id`,
    [
      sourceId,
      raw.externalId ?? hashUrl(url),
      url,
      raw.title,
      (raw.snippet ?? raw.title).slice(0, 500),
      raw.language,
      raw.publishedAt,
      raw.imageUrl ?? null,
      raw.fetchedAt,
      raw.categoryHint ?? null,
      articleCountry,
      raw.feedUrl ?? null,
    ],
  );

  return { id: inserted.rows[0].id, isNew: true };
}

export async function ingestArticles(
  articles: RawArticle[],
): Promise<{
  found: number;
  newCount: number;
  articleIds: string[];
  items: Array<{ id: string; isNew: boolean }>;
}> {
  let newCount = 0;
  const articleIds: string[] = [];
  const items: Array<{ id: string; isNew: boolean }> = [];

  for (const raw of articles) {
    const result = await ingestArticle(raw);
    if (result) {
      articleIds.push(result.id);
      items.push({ id: result.id, isNew: result.isNew });
      if (result.isNew) newCount++;
    }
  }

  return { found: articles.length, newCount, articleIds, items };
}

export async function getSourceTierScore(sourceId: string): Promise<number> {
  const res = await query<{ credibility_tier: string }>(
    'SELECT credibility_tier FROM sources WHERE id = $1',
    [sourceId],
  );
  return TIER_SCORES[res.rows[0]?.credibility_tier ?? 'unknown'] ?? 0.3;
}
