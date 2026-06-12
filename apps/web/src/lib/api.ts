import type {
  Event,
  EventDailySnapshot,
  EventListResponse,
  HotspotCandidate,
  Article,
} from '@event-time-line/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

export function getEvents(params?: {
  sort?: string;
  limit?: number;
}): Promise<EventListResponse> {
  const q = new URLSearchParams();
  if (params?.sort) q.set('sort', params.sort);
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return fetchApi(`/api/v1/events${qs ? `?${qs}` : ''}`);
}

export function getEvent(slug: string): Promise<Event> {
  return fetchApi(`/api/v1/events/${slug}`);
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

export function getCandidates(): Promise<{
  candidates: HotspotCandidate[];
  total: number;
}> {
  return fetchApi('/api/v1/candidates');
}

export async function trackCandidate(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/candidates/${id}/track`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to track candidate');
}

export async function archiveCandidate(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/candidates/${id}/archive`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to archive candidate');
}
