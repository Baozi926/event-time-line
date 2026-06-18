'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  archiveCandidate,
  subscribeFromCandidate,
  unsubscribeFromEvent,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function CandidateActions({
  candidateId,
  eventId,
  subscribed = false,
  subscribedDisplay = 'toggle',
  showAdminActions = true,
  redirectTo,
  layout = 'horizontal',
  compact = false,
  className,
}: {
  candidateId: string;
  eventId?: string;
  subscribed?: boolean;
  subscribedDisplay?: 'toggle' | 'status';
  showAdminActions?: boolean;
  redirectTo?: string;
  layout?: 'horizontal' | 'stacked';
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(subscribed);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setIsSubscribed(subscribed);
  }, [subscribed]);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [loading, setLoading] = useState<'subscribe' | 'archive' | null>(null);

  async function handleToggleSubscribe() {
    if (isSubscribed && subscribedDisplay === 'status') return;
    if (!user) {
      router.push('/login');
      return;
    }
    setFeedback(null);
    setLoading('subscribe');
    try {
      if (isSubscribed) {
        if (!eventId) throw new Error('候选尚未关联事件，无法取消关注');
        await unsubscribeFromEvent(eventId);
        setIsSubscribed(false);
      } else {
        await subscribeFromCandidate(candidateId);
        setIsSubscribed(true);
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : '关注失败');
    } finally {
      setLoading(null);
    }
  }

  async function confirmArchive() {
    setArchiveConfirmOpen(false);
    setFeedback(null);
    setLoading('archive');
    try {
      await archiveCandidate(candidateId);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(null);
    }
  }

  const stacked = layout === 'stacked';
  const primaryClass = compact
    ? 'rounded-full bg-gradient-to-r from-brand-600 to-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-200/60 transition hover:from-brand-700 hover:to-blue-600 disabled:opacity-50'
    : `btn-primary flex items-center ${stacked ? 'w-full justify-center py-2.5' : ''}`;
  const secondaryClass = compact
    ? 'rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50'
    : `btn-secondary flex items-center ${stacked ? 'w-full justify-center py-2.5' : ''}`;
  const archiveClass = compact
    ? 'rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50'
    : `btn-secondary flex items-center ${
        stacked
          ? 'w-full justify-center border-slate-200 py-2.5 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'
          : ''
      }`;
  const subscribeClass = isSubscribed ? secondaryClass : primaryClass;

  return (
    <>
      <div
        className={`flex gap-2 ${stacked ? 'flex-col' : 'flex-row flex-wrap'} ${className ?? ''}`}
      >
        {user ? (
          <button
            type="button"
            onClick={handleToggleSubscribe}
            disabled={loading !== null || (isSubscribed && subscribedDisplay === 'status')}
            className={subscribeClass}
          >
            {loading === 'subscribe'
              ? '处理中…'
              : isSubscribed
                ? subscribedDisplay === 'status'
                  ? '已关注'
                  : '取消关注'
                : '关注'}
          </button>
        ) : (
          <Link
            href="/login"
            className={primaryClass}
          >
            {compact ? '登录' : '登录后关注'}
          </Link>
        )}

        {isAdmin && showAdminActions && (
          <button
            type="button"
            onClick={() => setArchiveConfirmOpen(true)}
            disabled={loading !== null}
            className={archiveClass}
          >
            {loading === 'archive' ? '处理中…' : '归档'}
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="alert"
          className="mt-2 rounded-2xl border border-red-100 bg-red-50/95 px-3 py-2 text-xs font-medium text-red-700 shadow-sm shadow-red-100/60"
        >
          {feedback}
        </div>
      )}

      {archiveConfirmOpen && (
        <ConfirmDialog
          open={archiveConfirmOpen}
          title="确定归档这个候选？"
          description="归档后它将不再出现在候选池中，后续仍可通过数据重新发现。"
          confirmLabel="确定归档"
          cancelLabel="先不归档"
          variant="destructive"
          loading={loading === 'archive'}
          onConfirm={confirmArchive}
          onCancel={() => setArchiveConfirmOpen(false)}
        />
      )}
    </>
  );
}
