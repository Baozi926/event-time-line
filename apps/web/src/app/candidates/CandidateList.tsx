'use client';

import { useCallback, useEffect, useState } from 'react';
import { CandidateActions } from './CandidateActions';
import { CandidateListLink } from './CandidateListLink';
import type { HotspotCandidate } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import { HeatBar } from '@/components/ui/HeatBar';
import { InfiniteScrollFooter } from '@/components/ui/InfiniteScrollFooter';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useListScrollRestore } from '@/hooks/useListScrollRestore';
import { fetchCandidatesClient, LIST_PAGE_SIZE } from '@/lib/api';
import { CANDIDATES_SCROLL_KEY } from './candidateNavigation';
import {
  categoryLabel,
  countryLabel,
  formatCandidateTime,
} from './candidateLabels';

export function CandidateList({
  candidates: initialCandidates,
  total,
  listPath,
  sort = 'heat',
  filters,
}: {
  candidates: HotspotCandidate[];
  total: number;
  listPath: string;
  sort?: string;
  filters?: { category?: string; country?: string; language?: string };
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCandidates(initialCandidates);
    setError(null);
  }, [initialCandidates]);

  const hasMore = candidates.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCandidatesClient({
        sort,
        ...filters,
        limit: LIST_PAGE_SIZE,
        offset: candidates.length,
      });
      setCandidates((prev) => [...prev, ...data.candidates]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, candidates.length, sort, filters]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore });

  useListScrollRestore({
    storageKey: CANDIDATES_SCROLL_KEY,
    listPath,
    items: candidates,
    getItemId: (c) => c.id,
    domIdPrefix: 'candidate-',
    hasMore,
    loading,
    loadMore,
  });

  return (
    <>
      <div className="grid gap-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="card-hover group relative scroll-mt-24 overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-[1.25rem] bg-gradient-to-r from-brand-500 via-blue-400 to-orange-400" />
            <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
              <CandidateActions
                candidateId={candidate.id}
                eventId={candidate.eventId}
                subscribed={candidate.subscribed}
                layout="horizontal"
                compact
                className="justify-end"
              />
            </div>

            <CandidateListLink
              candidateId={candidate.id}
              listPath={listPath}
              className="block p-4 sm:p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 pr-24 sm:pr-32">
                <Badge variant="orange">候选</Badge>
                <HeatBar score={candidate.heatScore} showLabel={false} />
                {candidate.categoryHint && (
                  <Badge variant="brand">
                    {categoryLabel(candidate.categoryHint)}
                  </Badge>
                )}
                {candidate.countryCodes?.slice(0, 3).map((code) => (
                  <Badge key={code} variant="blue">
                    {countryLabel(code)}
                  </Badge>
                ))}
              </div>

              <h2 className="mb-2 pr-24 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-700 sm:pr-32 sm:text-lg">
                {candidate.title}
              </h2>

              {candidate.summary && candidate.summary !== candidate.title && (
                <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
                  {candidate.summary}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium">
                    {candidate.sourceCount} 个来源
                  </span>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium">
                    {candidate.articleCount} 篇文章
                  </span>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium">
                    更新 {formatCandidateTime(candidate.lastSeenAt)}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                  查看详情 →
                </span>
              </div>
            </CandidateListLink>

          </div>
        ))}
      </div>

      <InfiniteScrollFooter
        sentinelRef={sentinelRef}
        loading={loading}
        hasMore={hasMore}
        error={error}
        onRetry={loadMore}
        total={total}
      />
    </>
  );
}
