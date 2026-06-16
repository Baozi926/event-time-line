'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trackHotTrend } from '@/lib/api';

export function HotTrendTrackButton({
  platformId,
  platformName,
  title,
  url,
  rank,
}: {
  platformId: string;
  platformName: string;
  title: string;
  url: string;
  rank: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tracked, setTracked] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await trackHotTrend({ platformId, platformName, title, url, rank });
      setTracked(true);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : '加入关注失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || tracked}
      className="shrink-0 rounded-full border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
      aria-label={`将“${title}”加入关注`}
    >
      {loading ? '处理中…' : tracked ? '已关注' : '加入关注'}
    </button>
  );
}
