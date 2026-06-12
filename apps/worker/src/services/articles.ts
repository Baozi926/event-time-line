import { query } from '@event-time-line/database';
import type { RawArticle } from '@event-time-line/shared';
import { hashUrl, normalizeUrl } from '../utils.js';

const TIER_SCORES: Record<string, number> = {
  tier1: 1.0,
  tier2: 0.7,
  tier3: 0.4,
  unknown: 0.3,
};

export async function resolveSource(
  domain: string,
  name?: string,
): Promise<string> {
  const cleanDomain = domain.replace(/^www\./, '');
  const existing = await query<{ id: string }>(
    'SELECT id FROM sources WHERE domain = $1',
    [cleanDomain],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await query<{ id: string }>(
    `INSERT INTO sources (name, domain) VALUES ($1, $2)
     ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name ?? cleanDomain, cleanDomain],
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
    return { id: existing.rows[0].id, isNew: false };
  }

  const sourceId = await resolveSource(raw.domain);
  const inserted = await query<{ id: string }>(
    `INSERT INTO articles (
      source_id, external_id, url, title, snippet, language,
      published_at, image_url, fetched_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [
      sourceId,
      raw.externalId ?? hashUrl(url),
      url,
      raw.title,
      raw.title.slice(0, 300),
      raw.language,
      raw.publishedAt,
      raw.imageUrl ?? null,
      raw.fetchedAt,
    ],
  );

  return { id: inserted.rows[0].id, isNew: true };
}

export async function ingestArticles(
  articles: RawArticle[],
): Promise<{ found: number; newCount: number; articleIds: string[] }> {
  let newCount = 0;
  const articleIds: string[] = [];

  for (const raw of articles) {
    const result = await ingestArticle(raw);
    if (result) {
      articleIds.push(result.id);
      if (result.isNew) newCount++;
    }
  }

  return { found: articles.length, newCount, articleIds };
}

export async function getSourceTierScore(sourceId: string): Promise<number> {
  const res = await query<{ credibility_tier: string }>(
    'SELECT credibility_tier FROM sources WHERE id = $1',
    [sourceId],
  );
  return TIER_SCORES[res.rows[0]?.credibility_tier ?? 'unknown'] ?? 0.3;
}
