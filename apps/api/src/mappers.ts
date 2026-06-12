import type {
  Article,
  Event,
  EventDailySnapshot,
  HotspotCandidate,
  Source,
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
  return {
    id: row.id as string,
    clusterKey: row.cluster_key as string,
    title: row.title as string,
    categoryHint: row.category_hint as string | undefined,
    heatScore: Number(row.heat_score),
    articleCount: Number(row.article_count),
    sourceCount: Number(row.source_count),
    eventId: row.event_id as string | undefined,
    status: row.status as string,
    firstSeenAt: (row.first_seen_at as Date).toISOString(),
    lastSeenAt: (row.last_seen_at as Date).toISOString(),
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
