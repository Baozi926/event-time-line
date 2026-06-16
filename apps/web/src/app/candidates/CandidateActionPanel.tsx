'use client';

import Link from 'next/link';
import { CandidateActions } from './CandidateActions';

export function CandidateActionPanel({
  candidateId,
  eventId,
  subscribed = false,
  returnTo,
  eventSlug,
  compact = false,
}: {
  candidateId: string;
  eventId?: string;
  subscribed?: boolean;
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
        <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/50 to-orange-50/30 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">下一步操作</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            关注后会进入持续追踪，并出现在「我的关注」里。
          </p>
        </div>
      )}

      <div className={compact ? 'flex-1' : 'space-y-3 p-4'}>
        <CandidateActions
          candidateId={candidateId}
          eventId={eventId}
          subscribed={subscribed}
          redirectTo={returnTo}
          layout={compact ? 'horizontal' : 'stacked'}
          className={compact ? 'flex-1' : undefined}
        />

        {!compact && eventSlug && (
          <Link
            href={`/events/${eventSlug}`}
            className="flex items-center justify-between rounded-xl border border-dashed border-blue-200 px-3 py-2.5 text-sm text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700"
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
  eventId,
  subscribed = false,
  returnTo,
}: {
  candidateId: string;
  eventId?: string;
  subscribed?: boolean;
  returnTo: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100/90 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <CandidateActionPanel
        candidateId={candidateId}
        eventId={eventId}
        subscribed={subscribed}
        returnTo={returnTo}
        compact
      />
    </div>
  );
}
