'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { TopicSubscriptionListResponse } from '@event-time-line/shared';
import { subscribeToTopic, unsubscribeFromTopic } from '@/lib/api';

export function TopicSubscriptionPanel({
  data,
}: {
  data: TopicSubscriptionListResponse;
}) {
  const router = useRouter();
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function toggleTopic(slug: string, subscribed: boolean) {
    setFeedback(null);
    setLoadingSlug(slug);
    try {
      if (subscribed) {
        await unsubscribeFromTopic(slug);
      } else {
        await subscribeToTopic(slug);
      }
      router.refresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoadingSlug(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-blue-100/80 bg-white/90 shadow-sm">
      <div className="h-1 bg-gradient-to-r from-brand-500 via-blue-400 to-orange-400" />
      <div className="p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">我的主题</h2>
            <p className="text-sm text-slate-500">
              关注主题后，系统会自动为你推荐相关事件
            </p>
          </div>
          {data.topics.length > 0 && (
            <span className="inline-flex w-fit items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              已关注 {data.topics.length} 个主题
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {data.available.map((topic) => {
            const isSubscribed = topic.subscribed;
            const isLoading = loadingSlug === topic.slug;
            return (
              <button
                key={topic.slug}
                type="button"
                disabled={isLoading}
                onClick={() => toggleTopic(topic.slug, isSubscribed)}
                className={
                  isSubscribed
                    ? 'inline-flex items-center gap-2 rounded-full border border-brand-200 bg-gradient-to-r from-brand-600 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50'
                    : 'inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:opacity-50'
                }
              >
                {topic.icon && <span aria-hidden>{topic.icon}</span>}
                <span>{topic.name}</span>
                <span className="text-xs opacity-80">
                  {isLoading ? '处理中…' : isSubscribed ? '已关注' : '关注'}
                </span>
              </button>
            );
          })}
        </div>

        {feedback && (
          <p
            role="alert"
            className="mt-3 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
          >
            {feedback}
          </p>
        )}
      </div>
    </section>
  );
}
