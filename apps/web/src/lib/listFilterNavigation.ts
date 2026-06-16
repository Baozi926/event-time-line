export type ListFilterState = {
  category?: string;
  country?: string;
  language?: string;
  sort?: string;
};

export function buildListPath(
  basePath: string,
  filters: ListFilterState = {},
  options: { defaultSort?: string } = {},
): string {
  const defaultSort = options.defaultSort ?? 'heat';
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.country) params.set('country', filters.country);
  if (filters.language) params.set('language', filters.language);
  if (filters.sort && filters.sort !== defaultSort) params.set('sort', filters.sort);
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ''}`;
}

export function hasListFilters(filters: ListFilterState): boolean {
  return Boolean(filters.category || filters.country || filters.language);
}
