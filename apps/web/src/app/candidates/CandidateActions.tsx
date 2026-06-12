'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { archiveCandidate, trackCandidate } from '@/lib/api';

export function CandidateActions({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'track' | 'archive' | null>(null);

  async function handleTrack() {
    setLoading('track');
    try {
      await trackCandidate(candidateId);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(null);
    }
  }

  async function handleArchive() {
    setLoading('archive');
    try {
      await archiveCandidate(candidateId);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleTrack}
        disabled={loading !== null}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading === 'track' ? '处理中...' : '加入关注'}
      </button>
      <button
        onClick={handleArchive}
        disabled={loading !== null}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading === 'archive' ? '处理中...' : '归档'}
      </button>
    </div>
  );
}
