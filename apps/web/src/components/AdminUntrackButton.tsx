'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { untrackEvent } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function AdminUntrackButton({
  slug,
  redirectTo,
  className,
}: {
  slug: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function confirmUntrack() {
    setConfirmOpen(false);
    setFeedback(null);
    setLoading(true);
    try {
      await untrackEvent(slug);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className={className ?? 'btn-secondary text-sm'}
      >
        {loading ? '处理中…' : '归档'}
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
        title="确定归档这个事件？"
        description="归档后将不再持续采集相关报道。"
        confirmLabel="确定归档"
        cancelLabel="先不归档"
        variant="destructive"
        loading={loading}
        onConfirm={confirmUntrack}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
