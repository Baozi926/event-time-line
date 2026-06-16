'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { unsubscribeFromEvent } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function EventUntrackButton({
  eventId,
  onSuccess,
  redirectTo,
  variant = 'secondary',
  className,
}: {
  eventId: string;
  onSuccess?: () => void;
  redirectTo?: string;
  variant?: 'secondary' | 'text';
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function requestUnsubscribe(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setFeedback(null);
    setConfirmOpen(true);
  }

  async function confirmUnsubscribe() {
    setConfirmOpen(false);
    setLoading(true);
    try {
      await unsubscribeFromEvent(eventId);
      onSuccess?.();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else if (!onSuccess) {
        router.refresh();
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  const buttonClass =
    variant === 'text'
      ? className ??
        'shrink-0 text-xs font-medium text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50'
      : className ?? 'btn-secondary';

  return (
    <>
      <button
        type="button"
        onClick={requestUnsubscribe}
        disabled={loading}
        className={buttonClass}
      >
        {loading ? '处理中…' : '取消关注'}
      </button>
      {feedback && (
        <span
          role="alert"
          className="mt-1 block rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
        >
          {feedback}
        </span>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="确定取消关注这个事件？"
        description="取消后它会从你的关注列表移除，之后仍可以在事件页重新关注。"
        confirmLabel="取消关注"
        cancelLabel="再想想"
        variant="destructive"
        loading={loading}
        onConfirm={confirmUnsubscribe}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
