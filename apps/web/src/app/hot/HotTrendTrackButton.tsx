'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { subscribeHotTrend } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!user) {
    return (
      <Link
        href="/login"
        className="shrink-0 rounded-full border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
      >
        登录
      </Link>
    );
  }

  async function handleSubscribe() {
    setFeedback(null);
    setLoading(true);
    try {
      await subscribeHotTrend({ platformId, platformName, title, url, rank });
      setSubscribed(true);
      router.refresh();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : '关注失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 space-y-1">
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading || subscribed}
        className="rounded-full border border-brand-100 bg-white px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        aria-label={`关注“${title}”`}
      >
        {loading ? '处理中…' : subscribed ? '已关注' : '关注'}
      </button>
      {feedback && (
        <p
          role="alert"
          className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-right text-xs font-medium text-red-700"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
