// Event Timeline — Shared Type Definitions

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
}

export interface HotspotCandidate {
  id: string;
  clusterKey: string;
  title: string;
  categoryHint?: string;
  heatScore: number;
  articleCount: number;
  sourceCount: number;
  eventId?: string;
  status: string;
  firstSeenAt: string;
  lastSeenAt: string;
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
  startedAt: string;
  finishedAt?: string;
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
  topic?: string;
  country?: string;
  status?: EventStatus;
  limit?: number;
  offset?: number;
}

export interface EventListResponse {
  events: Event[];
  total: number;
  limit: number;
  offset: number;
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
  sourceType: 'gdelt_doc' | 'gdelt_events' | 'rss';
  externalId?: string;
  url: string;
  title: string;
  domain: string;
  language: string;
  country?: string;
  publishedAt: string;
  imageUrl?: string;
  categoryHint?: string;
  fetchedAt: string;
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
