'use client';

import type { RefObject } from 'react';

export function InfiniteScrollFooter({
  sentinelRef,
  loading,
  hasMore,
  error,
  onRetry,
  total,
}: {
  sentinelRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  onRetry: () => void;
  total: number;
}) {
  return (
    <div ref={sentinelRef} className="flex min-h-12 items-center justify-center py-4">
      {error && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm text-brand-600 hover:underline"
        >
          加载失败：{error}，点击重试
        </button>
      )}
      {!error && loading && (
        <span className="text-sm text-slate-400">加载中…</span>
      )}
      {!error && !loading && !hasMore && total > 0 && (
        <span className="text-sm text-slate-400">已加载全部 {total} 条</span>
      )}
    </div>
  );
}
