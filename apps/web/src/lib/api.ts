import type {
  Event,
  EventDailySnapshot,
  EventListResponse,
  CandidateListResponse,
  CandidateDetailResponse,
  Article,
  CollectionRun,
  DashboardStats,
  CollectionScheduleSettings,
  RssFeed,
  RssCollectionDailySummary,
  GdeltCollectionDailySummary,
  CreateRssFeedInput,
  UpdateRssFeedInput,
  TrackingHistoryResponse,
  HotTrendsResponse,
  SubscriptionListResponse,
  DataSourcesSettings,
  DataSourcesSettingsResponse,
} from '@event-time-line/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getServerCookieHeader(): Promise<string | undefined> {
  if (typeof window !== 'undefined') return undefined;
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  return header || undefined;
}

async function fetchClient<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const cookieHeader = await getServerCookieHeader();
  if (cookieHeader && !headers.has('cookie')) {
    headers.set('cookie', cookieHeader);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `API error: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

function buildEventsQuery(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.sort) q.set('sort', params.sort);
  if (params?.category) q.set('category', params.category);
  if (params?.country) q.set('country', params.country);
  if (params?.language) q.set('language', params.language);
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  return q.toString();
}

function buildCandidatesQuery(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.sort) q.set('sort', params.sort);
  if (params?.category) q.set('category', params.category);
  if (params?.country) q.set('country', params.country);
  if (params?.language) q.set('language', params.language);
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  return q.toString();
}

export const LIST_PAGE_SIZE = 20;

function buildSubscriptionsQuery(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.sort) q.set('sort', params.sort);
  if (params?.category) q.set('category', params.category);
  if (params?.country) q.set('country', params.country);
  if (params?.language) q.set('language', params.language);
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  return q.toString();
}

export function getMySubscriptions(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<SubscriptionListResponse> {
  const qs = buildSubscriptionsQuery(params);
  return fetchClient(`/api/v1/me/subscriptions${qs ? `?${qs}` : ''}`);
}

export function fetchMySubscriptionsClient(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<SubscriptionListResponse> {
  const qs = buildSubscriptionsQuery(params);
  return fetchClient(`/api/v1/me/subscriptions${qs ? `?${qs}` : ''}`);
}

export async function subscribeToEvent(eventId: string): Promise<void> {
  await fetchClient(`/api/v1/me/subscriptions/${eventId}`, { method: 'POST' });
}

export async function subscribeFromCandidate(candidateId: string): Promise<void> {
  await fetchClient(`/api/v1/me/subscriptions/from-candidate/${candidateId}`, {
    method: 'POST',
  });
}

export async function unsubscribeFromEvent(eventId: string): Promise<void> {
  await fetchClient(`/api/v1/me/subscriptions/${eventId}`, { method: 'DELETE' });
}

export function getEvents(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<EventListResponse> {
  const qs = buildEventsQuery(params);
  return fetchClient(`/api/v1/events${qs ? `?${qs}` : ''}`);
}

export function fetchEventsClient(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<EventListResponse> {
  const qs = buildEventsQuery(params);
  return fetchClient(`/api/v1/events${qs ? `?${qs}` : ''}`);
}

export function getEvent(slug: string): Promise<Event> {
  return fetchClient(`/api/v1/events/${slug}`);
}

export function getEventArticles(
  slug: string,
): Promise<{ articles: Article[] }> {
  return fetchApi(`/api/v1/events/${slug}/articles`);
}

export function getEventSnapshots(
  slug: string,
): Promise<{ snapshots: EventDailySnapshot[] }> {
  return fetchApi(`/api/v1/events/${slug}/snapshots`);
}

export function getCandidates(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<CandidateListResponse> {
  const qs = buildCandidatesQuery(params);
  return fetchClient(`/api/v1/candidates${qs ? `?${qs}` : ''}`);
}

export function fetchCandidatesClient(params?: {
  sort?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<CandidateListResponse> {
  const qs = buildCandidatesQuery(params);
  return fetchClient(`/api/v1/candidates${qs ? `?${qs}` : ''}`);
}

export async function getCandidate(id: string): Promise<CandidateDetailResponse> {
  try {
    return await fetchClient<CandidateDetailResponse>(`/api/v1/candidates/${id}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('404') || msg === 'Candidate not found') {
      throw new Error('候选不存在或已处理');
    }
    throw e;
  }
}

export async function trackCandidate(id: string): Promise<void> {
  await fetchClient(`/api/v1/candidates/${id}/track`, { method: 'POST' });
}

export async function archiveCandidate(id: string): Promise<void> {
  await fetchClient(`/api/v1/candidates/${id}/archive`, { method: 'POST' });
}

export async function untrackEvent(slug: string): Promise<void> {
  await fetchClient(`/api/v1/events/${slug}/untrack`, { method: 'POST' });
}

export function getCollectionRun(id: string): Promise<{ run: CollectionRun }> {
  return fetch(`${API_URL}/api/v1/collection/runs/${id}`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (res.status === 404) {
      throw new Error('采集记录不存在');
    }
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export function getCollectionRuns(params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  runs: CollectionRun[];
  total: number;
  isRunning: boolean;
  activeRun: CollectionRun | null;
}> {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  const qs = q.toString();
  return fetch(`${API_URL}/api/v1/collection/runs${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export function getRssDailySummary(): Promise<RssCollectionDailySummary> {
  return fetch(`${API_URL}/api/v1/collection/rss-daily`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export function getGdeltDailySummary(): Promise<GdeltCollectionDailySummary> {
  return fetch(`${API_URL}/api/v1/collection/gdelt-daily`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export type CollectionJob =
  | 'fetch'
  | 'fetch-hot-trend'
  | 'fetch-rss'
  | 'tracked'
  | 'snapshot'
  | 'all';

export async function triggerCollection(
  job: CollectionJob = 'fetch',
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/api/v1/collection/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job }),
  });
  const data = (await res.json()) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.error ?? '触发采集失败');
  }
  return { success: true, message: data.message ?? '采集任务已启动' };
}

export function getCollectionSchedule(): Promise<{
  settings: CollectionScheduleSettings;
  updatedAt: string;
}> {
  return fetch(`${API_URL}/api/v1/collection/settings`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export async function updateCollectionSchedule(
  settings: CollectionScheduleSettings,
): Promise<{ settings: CollectionScheduleSettings; updatedAt: string; message: string }> {
  const res = await fetch(`${API_URL}/api/v1/collection/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? '保存失败');
  }
  return data;
}

export function getRssFeeds(): Promise<{ feeds: RssFeed[] }> {
  return fetch(`${API_URL}/api/v1/rss-feeds`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export async function createRssFeed(
  input: CreateRssFeedInput,
): Promise<{ feed: RssFeed }> {
  const res = await fetch(`${API_URL}/api/v1/rss-feeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? '添加失败');
  }
  return data;
}

export async function updateRssFeed(
  id: string,
  input: UpdateRssFeedInput,
): Promise<{ feed: RssFeed }> {
  const res = await fetch(`${API_URL}/api/v1/rss-feeds/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? '更新失败');
  }
  return data;
}

export async function deleteRssFeed(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/rss-feeds/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? '删除失败');
  }
}

export function getDashboardStats(): Promise<DashboardStats> {
  return fetch(`${API_URL}/api/v1/stats/dashboard`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export function getTrackingHistory(params?: {
  action?: 'tracked' | 'untracked';
  limit?: number;
  offset?: number;
}): Promise<TrackingHistoryResponse> {
  const q = new URLSearchParams();
  if (params?.action) q.set('action', params.action);
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  const qs = q.toString();
  return fetch(`${API_URL}/api/v1/tracking/history${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export function getHotTrends(params?: { live?: boolean }): Promise<HotTrendsResponse> {
  const q = new URLSearchParams();
  if (params?.live) q.set('live', 'true');
  const qs = q.toString();
  return fetch(`${API_URL}/api/v1/hot-trends${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export async function trackHotTrend(input: {
  platformId: string;
  platformName?: string;
  title: string;
  url: string;
  rank?: number;
}): Promise<{ success: boolean; eventId: string }> {
  const data = await fetchClient<{ success?: boolean; eventId?: string }>(
    '/api/v1/hot-trends/track',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  if (!data.eventId) throw new Error('纳入系统追踪失败');
  return { success: Boolean(data.success), eventId: data.eventId };
}

export async function subscribeHotTrend(input: {
  platformId: string;
  platformName?: string;
  title: string;
  url: string;
  rank?: number;
}): Promise<{ success: boolean; eventId: string }> {
  const data = await fetchClient<{ success?: boolean; eventId?: string }>(
    '/api/v1/hot-trends/subscribe',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  if (!data.eventId) throw new Error('关注失败');
  return { success: Boolean(data.success), eventId: data.eventId };
}

export function getDataSourcesSettings(): Promise<DataSourcesSettingsResponse> {
  return fetch(`${API_URL}/api/v1/settings/data-sources`, {
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
}

export async function updateDataSourcesSettings(
  settings: DataSourcesSettings,
): Promise<DataSourcesSettingsResponse & { message: string }> {
  const res = await fetch(`${API_URL}/api/v1/settings/data-sources`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? '保存失败');
  }
  return data;
}
