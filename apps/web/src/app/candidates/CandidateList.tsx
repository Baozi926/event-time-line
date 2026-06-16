'use client';

import { useCallback, useEffect, useState } from 'react';
import { CandidateListLink } from './CandidateListLink';
import type { HotspotCandidate } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
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

function HeatBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-brand-700">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

export function CandidateList({
  candidates: initialCandidates,
  total,
  listPath,
  filters,
}: {
  candidates: HotspotCandidate[];
  total: number;
  listPath: string;
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
  }, [loading, hasMore, candidates.length, filters]);

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
          <CandidateListLink
            key={candidate.id}
            candidateId={candidate.id}
            listPath={listPath}
            className="card-hover group block scroll-mt-24 p-4 sm:p-5"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="orange">候选</Badge>
              <HeatBar score={candidate.heatScore} />
              {candidate.categoryHint && (
                <Badge variant="slate">
                  {categoryLabel(candidate.categoryHint)}
                </Badge>
              )}
              {candidate.countryCodes?.slice(0, 3).map((code) => (
                <Badge key={code} variant="blue">
                  {countryLabel(code)}
                </Badge>
              ))}
            </div>

            <h2 className="mb-2 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-700 sm:text-lg">
              {candidate.title}
            </h2>

            {candidate.summary && candidate.summary !== candidate.title && (
              <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
                {candidate.summary}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>{candidate.sourceCount} 个来源</span>
                <span>{candidate.articleCount} 篇文章</span>
                <span>首次发现 {formatCandidateTime(candidate.firstSeenAt)}</span>
                <span>最近更新 {formatCandidateTime(candidate.lastSeenAt)}</span>
              </div>
              <span className="shrink-0 text-xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                查看详情 →
              </span>
            </div>
          </CandidateListLink>
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
