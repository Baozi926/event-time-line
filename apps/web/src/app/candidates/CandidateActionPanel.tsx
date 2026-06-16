'use client';

import Link from 'next/link';
import { CandidateActions } from './CandidateActions';

export function CandidateActionPanel({
  candidateId,
  returnTo,
  eventSlug,
  compact = false,
}: {
  candidateId: string;
  returnTo: string;
  eventSlug?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact ? 'flex items-center gap-2' : 'card overflow-hidden'
      }
    >
      {!compact && (
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">下一步操作</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            加入关注后将持续采集相关报道；归档则不再出现在候选池。
          </p>
        </div>
      )}

      <div className={compact ? 'flex-1' : 'space-y-3 p-4'}>
        <CandidateActions
          candidateId={candidateId}
          redirectTo={returnTo}
          layout={compact ? 'horizontal' : 'stacked'}
          className={compact ? 'flex-1' : undefined}
        />

        {!compact && eventSlug && (
          <Link
            href={`/events/${eventSlug}`}
            className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700"
          >
            查看完整事件页
            <span aria-hidden className="text-slate-400">
              →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

export function CandidateActionBar({
  candidateId,
  returnTo,
}: {
  candidateId: string;
  returnTo: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <CandidateActionPanel
        candidateId={candidateId}
        returnTo={returnTo}
        compact
      />
    </div>
  );
}
