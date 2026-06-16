'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CollectionRun } from '@event-time-line/shared';
import { getCollectionRuns } from '@/lib/api';
import { CollectionRunsTable } from './CollectionRunsTable';

import { COLLECTION_RUNS_PAGE_SIZE } from './constants';
export function CollectionRunsLazyLoad({
  initialRuns,
  total,
}: {
  initialRuns: CollectionRun[];
  total: number;
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [effectiveTotal, setEffectiveTotal] = useState(total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = runs.length < effectiveTotal;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || runs.length >= effectiveTotal) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await getCollectionRuns({
        limit: COLLECTION_RUNS_PAGE_SIZE,
        offset: runs.length,
      });
      if (data.runs.length === 0) {
        setEffectiveTotal(runs.length);
        return;
      }

      setRuns((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        const next = data.runs.filter((r) => !ids.has(r.id));
        if (next.length === 0) {
          setEffectiveTotal(prev.length);
          return prev;
        }
        return [...prev, ...next];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [runs.length, effectiveTotal]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '240px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="space-y-3">
      <CollectionRunsTable runs={runs} />

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex min-h-10 items-center justify-center py-2"
          aria-hidden={!loading}
        >
          {loading && (
            <span className="text-sm text-slate-500">加载更多…</span>
          )}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            重试
          </button>
        </div>
      )}

      {!hasMore && effectiveTotal > COLLECTION_RUNS_PAGE_SIZE && (
        <p className="py-1 text-center text-xs text-slate-400">
          已加载全部 {effectiveTotal} 条记录
        </p>
      )}
    </div>
  );
}
