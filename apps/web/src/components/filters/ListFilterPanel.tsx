'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CandidateFacet } from '@event-time-line/shared';
import {
  buildListPath,
  hasListFilters,
  type ListFilterState,
} from '@/lib/listFilterNavigation';
import { categoryLabel, countryLabel, languageLabel } from '@/lib/filterLabels';

type SortOption = { value: string; label: string };

function visibleFacets(
  facets: CandidateFacet[],
  activeValue?: string,
): CandidateFacet[] {
  return facets.filter(
    (f) => f.count > 0 || (activeValue !== undefined && f.value === activeValue),
  );
}

function applyPatch(
  current: ListFilterState,
  patch: Partial<Record<keyof ListFilterState, string | null>>,
): ListFilterState {
  const next: ListFilterState = { ...current };
  for (const [key, value] of Object.entries(patch) as Array<
    [keyof ListFilterState, string | null | undefined]
  >) {
    if (value === null || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next;
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SidebarLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-600 to-blue-500 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm'
          : 'flex items-center justify-between rounded-xl px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-blue-50 hover:text-brand-700'
      }
    >
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={`ml-2 tabular-nums text-xs ${
            active ? 'text-white/75' : 'text-slate-400'
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export function ListFilterPanel({
  basePath,
  categories,
  countries,
  languages,
  activeCategory,
  activeCountry,
  activeLanguage,
  activeSort,
  sortOptions,
  defaultSort = 'heat',
  total,
}: {
  basePath: string;
  categories: CandidateFacet[];
  countries: CandidateFacet[];
  languages: CandidateFacet[];
  activeCategory?: string;
  activeCountry?: string;
  activeLanguage?: string;
  activeSort?: string;
  sortOptions?: SortOption[];
  defaultSort?: string;
  total: number;
}) {
  const router = useRouter();
  const current: ListFilterState = {
    category: activeCategory,
    country: activeCountry,
    language: activeLanguage,
    sort: activeSort,
  };
  const filtered = hasListFilters(current);
  const visibleCategories = visibleFacets(categories, activeCategory);
  const visibleCountries = visibleFacets(countries, activeCountry);
  const visibleLanguages = visibleFacets(languages, activeLanguage);

  const hrefFor = (patch: Partial<Record<keyof ListFilterState, string | null>>) =>
    buildListPath(basePath, applyPatch(current, patch), { defaultSort });

  const navigate = (patch: Partial<Record<keyof ListFilterState, string | null>>) => {
    router.push(hrefFor(patch));
  };

  return (
    <div className="rounded-[1.25rem] border border-blue-100/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm lg:max-h-[calc(100vh-6rem)]">
      <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-blue-50 pb-3">
        <h2 className="text-sm font-bold text-slate-900">筛选</h2>
        <span className="text-xs tabular-nums text-slate-400">
          {filtered ? `${total} 条结果` : `共 ${total} 条`}
        </span>
      </div>

      <div className="space-y-5">
        {sortOptions && sortOptions.length > 0 && (
          <FilterSection title="排序">
            <div className="space-y-0.5">
              {sortOptions.map((opt) => (
                <SidebarLink
                  key={opt.value}
                  href={hrefFor({ sort: opt.value === defaultSort ? null : opt.value })}
                  active={(activeSort ?? defaultSort) === opt.value}
                >
                  {opt.label}
                </SidebarLink>
              ))}
            </div>
          </FilterSection>
        )}

        <FilterSection title="类型">
          <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1 lg:max-h-[42vh]">
            <SidebarLink
              href={hrefFor({ category: null })}
              active={!activeCategory}
              count={total}
            >
              全部
            </SidebarLink>
            {visibleCategories.map((f) => (
              <SidebarLink
                key={f.value}
                href={hrefFor({ category: f.value })}
                active={activeCategory === f.value}
                count={f.count}
              >
                {categoryLabel(f.value)}
              </SidebarLink>
            ))}
          </div>
          {visibleCategories.length > 8 && (
            <p className="mt-2 text-[11px] text-slate-400">
              类型较多，这一栏可单独滚动
            </p>
          )}
        </FilterSection>

        {visibleCountries.length > 0 && (
          <FilterSection title="国家">
            <select
              value={activeCountry ?? ''}
              onChange={(e) => navigate({ country: e.target.value || null })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">全部</option>
              {visibleCountries.map((f) => (
                <option key={f.value} value={f.value}>
                  {countryLabel(f.value)} ({f.count})
                </option>
              ))}
            </select>
          </FilterSection>
        )}

        {visibleLanguages.length > 0 && (
          <FilterSection title="语种">
            <select
              value={activeLanguage ?? ''}
              onChange={(e) => navigate({ language: e.target.value || null })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">全部</option>
              {visibleLanguages.map((f) => (
                <option key={f.value} value={f.value}>
                  {languageLabel(f.value)} ({f.count})
                </option>
              ))}
            </select>
          </FilterSection>
        )}

        {filtered && (
          <Link
            href={buildListPath(
              basePath,
              { sort: activeSort !== defaultSort ? activeSort : undefined },
              { defaultSort },
            )}
            className="block w-full rounded-xl border border-blue-100 py-1.5 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-brand-700"
          >
            清除筛选
          </Link>
        )}
      </div>
    </div>
  );
}
