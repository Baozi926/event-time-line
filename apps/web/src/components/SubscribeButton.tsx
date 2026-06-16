'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { subscribeToEvent } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function SubscribeButton({
  eventId,
  subscribed = false,
  size = 'md',
  onSuccess,
}: {
  eventId: string;
  subscribed?: boolean;
  size?: 'sm' | 'md';
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(subscribed);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDone(subscribed);
  }, [subscribed]);

  if (!user) {
    return (
      <Link
        href="/login"
        className={
          size === 'sm'
            ? 'shrink-0 rounded-full border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50'
            : 'btn-primary'
        }
      >
        登录后关注
      </Link>
    );
  }

  if (done) {
    return (
      <span
        className={
          size === 'sm'
            ? 'shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400'
            : 'btn-secondary cursor-default opacity-70'
        }
      >
        已关注
      </span>
    );
  }

  async function handleSubscribe() {
    setFeedback(null);
    setLoading(true);
    try {
      await subscribeToEvent(eventId);
      setDone(true);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '关注失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className={
          size === 'sm'
            ? 'shrink-0 rounded-full border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:opacity-50'
            : 'btn-primary'
        }
      >
        {loading ? '处理中…' : '关注'}
      </button>
      {feedback && (
        <span
          role="alert"
          className="mt-1 block rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
        >
          {feedback}
        </span>
      )}
    </>
  );
}
