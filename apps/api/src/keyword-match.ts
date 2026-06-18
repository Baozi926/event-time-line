import {
  MIN_TOPIC_CLASSIFICATION_CONFIDENCE,
  TOPIC_DEFINITIONS,
  resolveKeywordToTopicSlug,
  type KeywordClassificationMatch,
  type KeywordMatchDetail,
} from '@event-time-line/shared';

export interface SubscribedKeyword {
  keyword: string;
  normalized: string;
}

export interface ResolvedKeywordSubscription extends SubscribedKeyword {
  topicSlug: string | null;
}

const ASCII_TOKEN_KEYWORD_RE = /^[a-z0-9][a-z0-9 _-]*$/;
const REGEXP_SPECIAL_RE = /[\\^$.*+?()[\]{}|]/g;

export function resolveSubscribedKeywords(
  keywords: SubscribedKeyword[],
): ResolvedKeywordSubscription[] {
  return keywords.map((item) => ({
    ...item,
    topicSlug: resolveKeywordToTopicSlug(item.normalized),
  }));
}

export function isAsciiTokenKeyword(normalized: string): boolean {
  return ASCII_TOKEN_KEYWORD_RE.test(normalized);
}

function escapeRegExp(value: string): string {
  return value.replace(REGEXP_SPECIAL_RE, '\\$&');
}

function containsFreeKeyword(text: string | undefined | null, normalized: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(normalized);
}

/** Free-text keywords: only non-ASCII phrases that do not map to a known topic. */
export function getFreeTextKeywords(
  keywords: ResolvedKeywordSubscription[],
): SubscribedKeyword[] {
  return keywords
    .filter((item) => !item.topicSlug && !isAsciiTokenKeyword(item.normalized))
    .map(({ keyword, normalized }) => ({ keyword, normalized }));
}

export function getTopicSlugsFromKeywords(
  keywords: ResolvedKeywordSubscription[],
): string[] {
  return [...new Set(keywords.map((item) => item.topicSlug).filter(Boolean) as string[])];
}

export function keywordTopicMatchSql(topicSlugsParamRef: string): string {
  return `
  EXISTS (
    SELECT 1
    FROM event_topics et
    JOIN topics t ON t.id = et.topic_id
    WHERE et.event_id = e.id
      AND t.slug = ANY(${topicSlugsParamRef}::text[])
      AND et.confidence >= ${MIN_TOPIC_CLASSIFICATION_CONFIDENCE}
  )`;
}

export function freeKeywordTextMatchSql(paramRef: string): string {
  return `
  EXISTS (
    SELECT 1
    FROM unnest(${paramRef}::text[]) kw(value)
    WHERE lower(e.title || ' ' || COALESCE(e.summary, '') || ' ' || COALESCE(e.category_hint, ''))
      LIKE '%' || kw.value || '%'
  )`;
}

export function keywordEventMatchSql(
  topicSlugsParamRef: string | null,
  freeKeywordsParamRef: string | null,
): string {
  const clauses: string[] = [];
  if (topicSlugsParamRef) clauses.push(keywordTopicMatchSql(topicSlugsParamRef));
  if (freeKeywordsParamRef) clauses.push(freeKeywordTextMatchSql(freeKeywordsParamRef));
  if (clauses.length === 0) return 'FALSE';
  return `(${clauses.join(' OR ')})`;
}

export function mapClassificationsForEvent(
  eventId: string,
  rows: Array<{
    event_id: string;
    slug: string;
    name: string;
    confidence: number | string;
    classification_reason: string | null;
  }>,
  resolvedKeywords: ResolvedKeywordSubscription[],
): KeywordClassificationMatch[] {
  const eventRows = rows.filter((row) => row.event_id === eventId);
  const matches: KeywordClassificationMatch[] = [];

  for (const item of resolvedKeywords) {
    if (!item.topicSlug) continue;
    const row = eventRows.find((entry) => entry.slug === item.topicSlug);
    if (!row) continue;

    matches.push({
      keyword: item.keyword,
      topicSlug: row.slug,
      topicName: row.name,
      confidence: Number(row.confidence),
      reason: row.classification_reason ?? undefined,
    });
  }

  return matches;
}

export function computeKeywordMatchesFromClassifications(
  classifications: KeywordClassificationMatch[],
  freeKeywords: SubscribedKeyword[],
  event: {
    title: string;
    summary?: string | null;
    categoryHint?: string | null;
  },
): KeywordMatchDetail[] {
  const results: KeywordMatchDetail[] = classifications.map((item) => ({
    keyword: item.keyword,
    topicSlug: item.topicSlug,
    topicName: item.topicName,
    confidence: item.confidence,
    reason: item.reason,
    similarity: item.similarity,
  }));

  for (const item of freeKeywords) {
    const fields: KeywordMatchDetail['fields'] = [];
    if (containsFreeKeyword(event.title, item.normalized)) fields.push('title');
    if (containsFreeKeyword(event.summary, item.normalized)) fields.push('summary');
    if (containsFreeKeyword(event.categoryHint, item.normalized)) fields.push('category');
    if (fields.length > 0) {
      results.push({
        keyword: item.keyword,
        fields,
        reason: `正文包含「${item.keyword}」`,
      });
    }
  }

  return results;
}

export function computeKeywordMatchesForEvent(
  event: {
    title: string;
    summary?: string | null;
    categoryHint?: string | null;
    classifications?: KeywordClassificationMatch[];
  },
  resolvedKeywords: ResolvedKeywordSubscription[],
): KeywordMatchDetail[] {
  const freeKeywords = getFreeTextKeywords(resolvedKeywords);
  return computeKeywordMatchesFromClassifications(
    event.classifications ?? [],
    freeKeywords,
    event,
  );
}

export function topicSlugToDisplayName(slug: string): string {
  return TOPIC_DEFINITIONS[slug]?.name ?? slug;
}
