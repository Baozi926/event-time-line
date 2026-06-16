import { buildListPath, type ListFilterState } from '@/lib/listFilterNavigation';
import { saveListScroll } from '@/lib/listScrollRestore';

export const FOLLOWING_SCROLL_KEY = 'following-list-scroll';

export type FollowingFilterState = Pick<
  ListFilterState,
  'category' | 'country' | 'language' | 'sort'
>;

export function buildFollowingListPath(
  filters: FollowingFilterState = {},
): string {
  return buildListPath('/', filters, { defaultSort: 'subscribed' });
}

export function buildEventDetailPath(slug: string, listPath: string): string {
  const params = new URLSearchParams({ returnTo: listPath });
  return `/events/${slug}?${params.toString()}`;
}

export function resolveFollowingReturnTo(returnTo?: string): string {
  if (!returnTo) return '/';
  try {
    const url = new URL(returnTo, 'http://local');
    if (url.pathname !== '/') return '/';
    if (url.searchParams.get('view') === 'history') return '/';
    return `${url.pathname}${url.search}`;
  } catch {
    return '/';
  }
}

export function saveFollowingListScroll(listPath: string, eventId: string): void {
  saveListScroll(FOLLOWING_SCROLL_KEY, listPath, eventId);
}
