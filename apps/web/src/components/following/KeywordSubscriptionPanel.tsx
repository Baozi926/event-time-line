'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import type { KeywordSubscriptionListResponse } from '@event-time-line/shared';
import { TOPIC_DEFINITIONS } from '@event-time-line/shared';
import { subscribeToKeyword, unsubscribeFromKeyword } from '@/lib/api';

export function KeywordSubscriptionPanel({
  data,
  className = '',
}: {
  data: KeywordSubscriptionListResponse;
  className?: string;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setLoading(true);
    try {
      await subscribeToKeyword(keyword);
      setKeyword('');
      router.refresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '添加失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setFeedback(null);
    setDeletingId(id);
    try {
      await unsubscribeFromKeyword(id);
      router.refresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      className={`overflow-hidden rounded-[1.35rem] border border-blue-100/80 bg-white/90 shadow-sm ${className}`}
    >
      <div className="h-1 bg-gradient-to-r from-brand-500 via-blue-400 to-orange-400" />
      <div className="p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">关键词关注</h2>
            <p className="text-sm text-slate-500">
              输入你关心的词，系统会先做主题分类，再把相关事件收进推荐列表
            </p>
          </div>
          {data.keywords.length > 0 && (
            <span className="inline-flex w-fit items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              已关注 {data.keywords.length} 个关键词
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="例如：AI、半导体、台海、地震"
            minLength={2}
            maxLength={80}
            className="min-w-0 flex-1 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={loading || keyword.trim().length < 2}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '添加中…' : '关注关键词'}
          </button>
        </form>

        {data.keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.keywords.map((item) => {
              const isDeleting = deletingId === item.id;
              const mappedTopic = item.mappedTopicSlug
                ? TOPIC_DEFINITIONS[item.mappedTopicSlug]
                : undefined;
              return (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700"
                >
                  <span>{item.keyword}</span>
                  {mappedTopic && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-brand-600">
                      按 {mappedTopic.name} 主题
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(item.id)}
                    className="rounded-full px-1 text-xs text-brand-700/70 transition-colors hover:bg-white hover:text-brand-900 disabled:opacity-50"
                    aria-label={`取消关注 ${item.keyword}`}
                  >
                    {isDeleting ? '…' : '×'}
                  </button>
                </span>
              );
            })}
          </div>
        )}

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
