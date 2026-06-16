import { buildListPath, type ListFilterState } from '@/lib/listFilterNavigation';
import { saveListScroll } from '@/lib/listScrollRestore';

export const CANDIDATES_SCROLL_KEY = 'candidates-list-scroll';

export type CandidatesFilterState = Pick<
  ListFilterState,
  'category' | 'country' | 'language'
>;

export function buildCandidatesListPath(
  filters: CandidatesFilterState = {},
): string {
  return buildListPath('/candidates', filters);
}

export function buildCandidateDetailPath(
  candidateId: string,
  listPath: string,
): string {
  const params = new URLSearchParams({ returnTo: listPath });
  return `/candidates/${candidateId}?${params.toString()}`;
}

export function resolveCandidatesReturnTo(returnTo?: string): string {
  if (returnTo?.startsWith('/candidates')) {
    return returnTo;
  }
  return '/candidates';
}

export function parseCandidatesListFilters(
  listPath: string,
): CandidatesFilterState {
  try {
    const url = new URL(listPath, 'http://local');
    const category = url.searchParams.get('category') ?? undefined;
    const country = url.searchParams.get('country') ?? undefined;
    const language = url.searchParams.get('language') ?? undefined;
    return {
      ...(category ? { category } : {}),
      ...(country ? { country } : {}),
      ...(language ? { language } : {}),
    };
  } catch {
    return {};
  }
}

export function hasCandidatesListFilters(filters: CandidatesFilterState): boolean {
  return Boolean(filters.category || filters.country || filters.language);
}

export function saveCandidatesListScroll(
  listPath: string,
  candidateId: string,
): void {
  saveListScroll(CANDIDATES_SCROLL_KEY, listPath, candidateId);
}
