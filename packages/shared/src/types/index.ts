// 拾光纪 — Shared Type Definitions

export type EventStatus = 'developing' | 'settled' | 'long_term' | 'disputed';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type CredibilityTier = 'tier1' | 'tier2' | 'tier3' | 'unknown';
export type LocationType = 'country' | 'region' | 'city' | 'point';
export type TimelineNodeType =
  | 'outbreak'
  | 'escalation'
  | 'turning_point'
  | 'official_statement'
  | 'development'
  | 'aftermath';
export type EventRelationType = 'background' | 'consequence' | 'parallel' | 'sub_event';
export type TrackingStatus = 'candidate' | 'tracking' | 'archived';
export type TrackingAction = 'tracked' | 'untracked';
export type TrackingSource = 'manual' | 'auto_promote' | 'auto_archive';
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  locale: string;
  createdAt: string;
}

export interface AuthMeResponse {
  user: User;
}

export interface SubscriptionListResponse {
  events: Event[];
  total: number;
  limit: number;
  offset: number;
  facets: {
    categories: CandidateFacet[];
    countries: CandidateFacet[];
    languages: CandidateFacet[];
  };
}

export interface TrackingHistoryEventSummary {
  slug: string;
  title: string;
  trackingStatus: TrackingStatus;
  heatScore: number;
  categoryHint?: string;
}

export interface TrackingHistoryEntry {
  id: string;
  eventId: string;
  action: TrackingAction;
  source: TrackingSource;
  createdAt: string;
  event?: TrackingHistoryEventSummary;
}

export interface TrackingHistoryResponse {
  entries: TrackingHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface Source {
  id: string;
  name: string;
  domain: string;
  countryCode?: string;
  language?: string;
  credibilityTier: CredibilityTier;
  logoUrl?: string;
}

export interface Location {
  id: string;
  name: string;
  nameEn?: string;
  type: LocationType;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  parentId?: string;
  wikidataId?: string;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  icon?: string;
  sortOrder: number;
}

export interface Article {
  id: string;
  sourceId: string;
  source?: Source;
  externalId?: string;
  url: string;
  title: string;
  titleZh?: string;
  snippet?: string;
  snippetZh?: string;
  language: string;
  publishedAt: string;
  fetchedAt: string;
  tone?: number;
  imageUrl?: string;
  locationId?: string;
  location?: Location;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  titleEn?: string;
  summary: string;
  status: EventStatus;
  trackingStatus: TrackingStatus;
  confidence: ConfidenceLevel;
  heatScore: number;
  articleCount: number;
  sourceCount: number;
  locationId?: string;
  location?: Location;
  topics?: Topic[];
  categoryHint?: string;
  firstSeenAt: string;
  lastUpdatedAt: string;
  lastCollectedAt?: string;
  peakAt?: string;
  coverImageUrl?: string;
  isFeatured: boolean;
  subscribed?: boolean;
}

export interface HotspotCandidate {
  id: string;
  clusterKey: string;
  title: string;
  summary?: string;
  categoryHint?: string;
  primaryCountryCode?: string;
  countryCodes?: string[];
  heatScore: number;
  articleCount: number;
  sourceCount: number;
  eventId?: string;
  slug?: string;
  subscribed?: boolean;
  status: string;
  firstSeenAt: string;
  lastSeenAt: string;
  articles?: CandidateArticleSummary[];
}

export interface CandidateArticleSummary {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  language: string;
  publishedAt: string;
  categoryHint?: string;
  countryCode?: string;
  sourceName?: string;
  sourceDomain?: string;
}

export interface CandidateFacet {
  value: string;
  count: number;
}

export interface CandidateListParams {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}

export interface CandidateListResponse {
  candidates: HotspotCandidate[];
  total: number;
  limit: number;
  offset: number;
  facets: {
    categories: CandidateFacet[];
    countries: CandidateFacet[];
    languages: CandidateFacet[];
  };
}

export interface CandidateDetailResponse {
  candidate: HotspotCandidate;
}

export interface EventDailySnapshot {
  id: string;
  eventId: string;
  snapshotDate: string;
  heatScore: number;
  articleCount: number;
  sourceCount: number;
  newArticles24h: number;
  summary?: string;
  topHeadlines?: Array<{ title: string; url: string; source: string }>;
  createdAt: string;
}

export interface CollectionRunArticle {
  id: string;
  title: string;
  url: string;
  domain: string;
  isNew: boolean;
}

export interface CollectionRunMetadata {
  articles?: CollectionRunArticle[];
  scored?: number;
  rssFeeds?: CollectionRunRssFeedResult[];
}

export interface CollectionRunRssFeedResult {
  feedId?: string;
  feedName: string;
  feedUrl: string;
  status: 'completed' | 'failed' | 'skipped';
  articlesFound: number;
  articlesNew?: number;
  errorMessage?: string;
  skippedReason?: string;
}

export interface RssFeedDailyStats {
  feedId?: string;
  feedName: string;
  feedUrl: string;
  enabled: boolean;
  todayRuns: number;
  successCount: number;
  failCount: number;
  skippedCount: number;
  todayArticlesFound: number;
  todayArticlesNew: number;
  lastStatus?: 'completed' | 'failed' | 'skipped';
  lastAt?: string;
  lastArticlesFound?: number;
  lastError?: string;
  lastSkippedReason?: string;
}

export interface RssCollectionDailySummary {
  date: string;
  pipelineRuns: number;
  todayArticlesFound: number;
  todayArticlesNew: number;
  feeds: RssFeedDailyStats[];
}

export interface GdeltCategoryDailyStats {
  category: string;
  todayRuns: number;
  successCount: number;
  failCount: number;
  todayArticlesFound: number;
  todayArticlesNew: number;
  lastStatus?: 'completed' | 'failed';
  lastAt?: string;
  lastArticlesFound?: number;
  lastError?: string;
}

export interface GdeltCollectionDailySummary {
  date: string;
  pipelineRuns: number;
  todayArticlesFound: number;
  todayArticlesNew: number;
  categories: GdeltCategoryDailyStats[];
}

export interface CollectionRun {
  id: string;
  runType: string;
  sourceType?: string;
  eventId?: string;
  category?: string;
  status: string;
  articlesFound: number;
  articlesNew: number;
  eventsCreated: number;
  eventsPromoted: number;
  errorMessage?: string;
  metadata?: CollectionRunMetadata;
  startedAt: string;
  finishedAt?: string;
}

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  domain: string;
  language: string;
  enabled: boolean;
  isBuiltin: boolean;
  sortOrder: number;
  /** null = 继承全局 RSS 默认间隔 */
  fetchIntervalMinutes: number | null;
  lastFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRssFeedInput {
  name: string;
  url: string;
  domain?: string;
  language?: string;
}

export interface UpdateRssFeedInput {
  name?: string;
  enabled?: boolean;
  language?: string;
  /** null = 恢复为全局默认间隔 */
  fetchIntervalMinutes?: number | null;
}

export interface TimelineItem {
  id: string;
  eventId: string;
  occurredAt: string;
  title: string;
  description?: string;
  nodeType: TimelineNodeType;
  importance: number;
  sourceArticles?: Article[];
  isAiGenerated: boolean;
  sortOrder: number;
}

export interface EventDetail extends Event {
  timeline: TimelineItem[];
  articles: Article[];
  relatedEvents?: Event[];
}

export interface Subscription {
  id: string;
  userId: string;
  eventId: string;
  event?: Event;
  notifyOnUpdate: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  eventId: string;
  timelineItemId?: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
}

// API Request / Response types

export interface EventListParams {
  sort?: 'heat' | 'recent' | 'updated';
  category?: string;
  topic?: string;
  country?: string;
  language?: string;
  status?: EventStatus;
  limit?: number;
  offset?: number;
}

export interface EventListResponse {
  events: Event[];
  total: number;
  limit: number;
  offset: number;
  facets: {
    categories: CandidateFacet[];
    countries: CandidateFacet[];
    languages: CandidateFacet[];
  };
}

export interface SearchParams {
  q: string;
  topic?: string;
  country?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  events: Event[];
  total: number;
  query: string;
}

// Pipeline types

export interface RawArticle {
  sourceType:
    | 'gdelt_doc'
    | 'gdelt_events'
    | 'rss'
    | 'valyu'
    | 'usgs_earthquake'
    | 'hot_trend';
  externalId?: string;
  url: string;
  title: string;
  domain: string;
  language: string;
  country?: string;
  publishedAt: string;
  imageUrl?: string;
  snippet?: string;
  categoryHint?: string;
  fetchedAt: string;
  /** RSS 订阅 URL，用于按源统计 */
  feedUrl?: string;
}

export interface ClusterResult {
  action: 'merge' | 'create' | 'hold' | 'pending';
  eventId?: string;
  similarity?: number;
  articleId: string;
}

export interface SummaryResult {
  title: string;
  summary: string;
  status: EventStatus;
  confidence: ConfidenceLevel;
}

export interface TimelineNodeResult {
  occurredAt: string;
  title: string;
  description?: string;
  nodeType: TimelineNodeType;
  importance: number;
  sourceIndices: number[];
}

export interface TimelineResult {
  nodes: TimelineNodeResult[];
}

export interface DashboardTopEvent {
  id: string;
  slug: string;
  title: string;
  heatScore: number;
  articleCount: number;
  sourceCount: number;
  lastUpdatedAt: string;
}

export interface DashboardTopCandidate {
  id: string;
  title: string;
  heatScore: number;
  articleCount: number;
  sourceCount: number;
}

export interface HotTrendItem {
  rank: number;
  title: string;
  url: string;
}

export interface HotTrendPlatformBoard {
  platformId: string;
  platformName: string;
  updatedAt?: string;
  items: HotTrendItem[];
  error?: string;
}

export interface HotTrendsResponse {
  boards: HotTrendPlatformBoard[];
  fetchedAt: string;
  source: 'live' | 'cache';
  enabled: boolean;
}

export interface DashboardDailyCount {
  date: string;
  count: number;
}

export interface DashboardCategoryActivity {
  category: string;
  articlesFound: number;
  articlesNew: number;
  runs: number;
}

export interface DashboardStats {
  generatedAt: string;
  collection: {
    isRunning: boolean;
    activeRun: CollectionRun | null;
    totalRuns: number;
    last24h: {
      runs: number;
      completed: number;
      failed: number;
      articlesFound: number;
      articlesNew: number;
      eventsCreated: number;
      eventsPromoted: number;
    };
    recentRuns: CollectionRun[];
    categoryActivity: DashboardCategoryActivity[];
  };
  data: {
    articles: { total: number; last24h: number; last1h: number };
    sources: { total: number };
    events: { tracking: number; candidate: number; archived: number; total: number };
    candidates: { open: number };
  };
  topEvents: DashboardTopEvent[];
  topCandidates: DashboardTopCandidate[];
  articlesDaily: DashboardDailyCount[];
}
