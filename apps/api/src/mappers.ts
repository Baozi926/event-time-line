import type {
  Article,
  CandidateArticleSummary,
  CollectionRun,
  Event,
  EventDailySnapshot,
  HotspotCandidate,
  RssFeed,
  Source,
  TrackingHistoryEntry,
  TrackingStatus,
} from '@event-time-line/shared';

export function mapEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    titleEn: row.title_en as string | undefined,
    summary: row.summary as string,
    status: row.status as Event['status'],
    trackingStatus: row.tracking_status as Event['trackingStatus'],
    confidence: row.confidence as Event['confidence'],
    heatScore: Number(row.heat_score),
    articleCount: Number(row.article_count),
    sourceCount: Number(row.source_count),
    locationId: row.location_id as string | undefined,
    categoryHint: row.category_hint as string | undefined,
    firstSeenAt: (row.first_seen_at as Date).toISOString(),
    lastUpdatedAt: (row.last_updated_at as Date).toISOString(),
    lastCollectedAt: row.last_collected_at
      ? (row.last_collected_at as Date).toISOString()
      : undefined,
    peakAt: row.peak_at ? (row.peak_at as Date).toISOString() : undefined,
    coverImageUrl: row.cover_image_url as string | undefined,
    isFeatured: Boolean(row.is_featured),
    subscribed: row.subscribed != null ? Boolean(row.subscribed) : undefined,
  };
}

export function mapArticle(row: Record<string, unknown>): Article {
  const article: Article = {
    id: row.id as string,
    sourceId: row.source_id as string,
    externalId: row.external_id as string | undefined,
    url: row.url as string,
    title: row.title as string,
    titleZh: row.title_zh as string | undefined,
    snippet: row.snippet as string | undefined,
    language: row.language as string,
    publishedAt: (row.published_at as Date).toISOString(),
    fetchedAt: (row.fetched_at as Date).toISOString(),
    tone: row.tone != null ? Number(row.tone) : undefined,
    imageUrl: row.image_url as string | undefined,
  };

  if (row.source_name) {
    article.source = {
      id: row.source_id as string,
      name: row.source_name as string,
      domain: row.source_domain as string,
      credibilityTier: row.credibility_tier as Source['credibilityTier'],
    };
  }

  return article;
}

export function mapCandidate(row: Record<string, unknown>): HotspotCandidate {
  const countryCodes = row.country_codes as string[] | null | undefined;
  return {
    id: row.id as string,
    clusterKey: row.cluster_key as string,
    title: row.title as string,
    summary: row.event_summary as string | undefined,
    categoryHint: row.category_hint as string | undefined,
    primaryCountryCode: row.primary_country_code as string | undefined,
    countryCodes: countryCodes?.length ? countryCodes : undefined,
    heatScore: Number(row.heat_score),
    articleCount: Number(row.article_count),
    sourceCount: Number(row.source_count),
    eventId: row.event_id as string | undefined,
    slug: row.event_slug as string | undefined,
    subscribed: Boolean(row.subscribed),
    status: row.status as string,
    firstSeenAt: (row.first_seen_at as Date).toISOString(),
    lastSeenAt: (row.last_seen_at as Date).toISOString(),
  };
}

export function mapCandidateArticle(
  row: Record<string, unknown>,
): CandidateArticleSummary {
  return {
    id: row.id as string,
    title: row.title as string,
    url: row.url as string,
    snippet: row.snippet as string | undefined,
    language: row.language as string,
    publishedAt: (row.published_at as Date).toISOString(),
    categoryHint: row.category_hint as string | undefined,
    countryCode: row.country_code as string | undefined,
    sourceName: row.source_name as string | undefined,
    sourceDomain: row.source_domain as string | undefined,
  };
}

function parseMetadata(row: Record<string, unknown>): CollectionRun['metadata'] {
  if (!row.metadata) return undefined;
  const raw =
    typeof row.metadata === 'string'
      ? (JSON.parse(row.metadata) as CollectionRun['metadata'])
      : (row.metadata as CollectionRun['metadata']);
  return raw ?? undefined;
}

export function mapCollectionRun(row: Record<string, unknown>): CollectionRun {
  return {
    id: row.id as string,
    runType: row.run_type as string,
    sourceType: row.source_type as string | undefined,
    eventId: row.event_id as string | undefined,
    category: row.category as string | undefined,
    status: row.status as string,
    articlesFound: Number(row.articles_found),
    articlesNew: Number(row.articles_new),
    eventsCreated: Number(row.events_created),
    eventsPromoted: Number(row.events_promoted),
    errorMessage: row.error_message as string | undefined,
    metadata: parseMetadata(row),
    startedAt: (row.started_at as Date).toISOString(),
    finishedAt: row.finished_at
      ? (row.finished_at as Date).toISOString()
      : undefined,
  };
}

export function mapSnapshot(row: Record<string, unknown>): EventDailySnapshot {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    snapshotDate: (row.snapshot_date as Date).toISOString().slice(0, 10),
    heatScore: Number(row.heat_score),
    articleCount: Number(row.article_count),
    sourceCount: Number(row.source_count),
    newArticles24h: Number(row.new_articles_24h),
    summary: row.summary as string | undefined,
    topHeadlines: row.top_headlines
      ? (typeof row.top_headlines === 'string'
          ? JSON.parse(row.top_headlines)
          : row.top_headlines)
      : undefined,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export function mapRssFeed(row: Record<string, unknown>): RssFeed {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    domain: row.domain as string,
    language: row.language as string,
    enabled: Boolean(row.enabled),
    isBuiltin: Boolean(row.is_builtin),
    sortOrder: Number(row.sort_order),
    fetchIntervalMinutes: row.fetch_interval_minutes == null
      ? null
      : Number(row.fetch_interval_minutes),
    lastFetchedAt: row.last_fetched_at
      ? (row.last_fetched_at as Date).toISOString()
      : null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export function mapTrackingHistoryEntry(
  row: Record<string, unknown>,
): TrackingHistoryEntry {
  const entry: TrackingHistoryEntry = {
    id: row.id as string,
    eventId: row.event_id as string,
    action: row.action as TrackingHistoryEntry['action'],
    source: row.source as TrackingHistoryEntry['source'],
    createdAt: (row.created_at as Date).toISOString(),
  };

  if (row.event_slug) {
    entry.event = {
      slug: row.event_slug as string,
      title: row.event_title as string,
      trackingStatus: row.event_tracking_status as TrackingStatus,
      heatScore: Number(row.event_heat_score),
      categoryHint: row.event_category_hint as string | undefined,
    };
  }

  return entry;
}
