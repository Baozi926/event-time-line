'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { untrackEvent } from '@/lib/api';

export function EventUntrackButton({
  slug,
  onSuccess,
  redirectTo,
  variant = 'secondary',
  className,
}: {
  slug: string;
  onSuccess?: () => void;
  redirectTo?: string;
  variant?: 'secondary' | 'text';
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUntrack(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();

    if (!window.confirm('确定取消关注此事件？取消后将不再持续采集相关报道。')) {
      return;
    }

    setLoading(true);
    try {
      await untrackEvent(slug);
      onSuccess?.();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else if (!onSuccess) {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={handleUntrack}
        disabled={loading}
        className={
          className ??
          'shrink-0 text-xs font-medium text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50'
        }
      >
        {loading ? '处理中…' : '取消关注'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleUntrack}
      disabled={loading}
      className={className ?? 'btn-secondary'}
    >
      {loading ? '处理中…' : '取消关注'}
    </button>
  );
}
