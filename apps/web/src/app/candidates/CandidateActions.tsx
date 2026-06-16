'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { archiveCandidate, trackCandidate } from '@/lib/api';

export function CandidateActions({
  candidateId,
  redirectTo,
  layout = 'horizontal',
  className,
}: {
  candidateId: string;
  redirectTo?: string;
  layout?: 'horizontal' | 'stacked';
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<'track' | 'archive' | null>(null);

  async function handleTrack() {
    setLoading('track');
    try {
      await trackCandidate(candidateId);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(null);
    }
  }

  async function handleArchive() {
    if (
      !window.confirm('确定归档此候选？归档后将不再出现在候选池中。')
    ) {
      return;
    }
    setLoading('archive');
    try {
      await archiveCandidate(candidateId);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(null);
    }
  }

  const stacked = layout === 'stacked';

  return (
    <div
      className={`flex gap-2 ${stacked ? 'flex-col' : 'flex-row'} ${className ?? ''}`}
    >
      <button
        onClick={handleTrack}
        disabled={loading !== null}
        className={`btn-primary flex items-center ${stacked ? 'w-full justify-center py-2.5' : ''}`}
      >
        {loading === 'track' ? '处理中…' : '加入关注'}
      </button>
      <button
        onClick={handleArchive}
        disabled={loading !== null}
        className={`btn-secondary flex items-center ${
          stacked
            ? 'w-full justify-center border-slate-200 py-2.5 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'
            : ''
        }`}
      >
        {loading === 'archive' ? '处理中…' : '归档'}
      </button>
    </div>
  );
}
