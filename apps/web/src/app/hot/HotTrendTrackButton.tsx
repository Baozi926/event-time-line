'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { subscribeHotTrend, trackHotTrend } from '@/lib/api';
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
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState<'subscribe' | 'track' | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [tracked, setTracked] = useState(false);
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
    setLoading('subscribe');
    try {
      await subscribeHotTrend({ platformId, platformName, title, url, rank });
      setSubscribed(true);
      router.refresh();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : '关注失败');
    } finally {
      setLoading(null);
    }
  }

  async function handleTrack() {
    setFeedback(null);
    setLoading('track');
    try {
      await trackHotTrend({ platformId, platformName, title, url, rank });
      setTracked(true);
      router.refresh();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : '纳入系统追踪失败');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="shrink-0 space-y-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading !== null || subscribed}
          className="rounded-full border border-brand-100 bg-white px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          aria-label={`关注“${title}”`}
        >
          {loading === 'subscribe' ? '处理中…' : subscribed ? '已关注' : '关注'}
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={handleTrack}
            disabled={loading !== null || tracked}
            className="rounded-full border border-orange-100 bg-white px-2.5 py-1 text-xs font-medium text-orange-700 transition-colors hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
            aria-label={`将“${title}”纳入系统追踪`}
          >
            {loading === 'track' ? '处理中…' : tracked ? '已追踪' : '系统追踪'}
          </button>
        )}
      </div>
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
