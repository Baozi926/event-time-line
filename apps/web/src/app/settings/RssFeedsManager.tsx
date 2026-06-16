'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_COLLECTION_SCHEDULE,
  MAX_RSS_FEEDS,
  RSS_FEED_INTERVAL_OPTIONS,
  formatMinutesLabel,
  type CreateRssFeedInput,
  type RssFeed,
} from '@event-time-line/shared';
import { createRssFeed, deleteRssFeed, getCollectionSchedule, updateRssFeed } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function formatFeedIntervalLabel(minutes: number | null): string {
  if (minutes == null) return '全局默认';
  return formatMinutesLabel(minutes);
}
function formatLastFetchedAt(value: string | null): string {
  if (!value) return '尚未采集';
  return new Date(value).toLocaleString('zh-CN');
}

export function RssFeedsManager({
  initialFeeds,
  rssDefaultIntervalMinutes: initialRssDefaultIntervalMinutes,
}: {
  initialFeeds: RssFeed[];
  rssDefaultIntervalMinutes: number;
}) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [rssDefaultIntervalMinutes, setRssDefaultIntervalMinutes] = useState(
    initialRssDefaultIntervalMinutes,
  );  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingDeleteFeed, setPendingDeleteFeed] = useState<RssFeed | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCollectionSchedule()
      .then(({ settings }) => {
        if (!cancelled) {
          setRssDefaultIntervalMinutes(settings.rssDefaultIntervalMinutes);
        }
      })
      .catch(() => {
        // 保留服务端传入的初始值
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(e: React.FormEvent) {    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const input: CreateRssFeedInput = { name, url, language };
    try {
      const { feed } = await createRssFeed(input);
      setFeeds((prev) => [...prev, feed]);
      setName('');
      setUrl('');
      setLanguage('en');
      setMessage(`已添加「${feed.name}」`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleIntervalChange(feed: RssFeed, value: string) {
    const fetchIntervalMinutes = value === '' ? null : Number(value);
    setPendingId(feed.id);
    setMessage(null);
    setError(null);
    try {
      const { feed: updated } = await updateRssFeed(feed.id, { fetchIntervalMinutes });
      setFeeds((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setPendingId(null);
    }
  }

  async function handleToggle(feed: RssFeed) {
    setPendingId(feed.id);
    setMessage(null);
    setError(null);
    try {
      const { feed: updated } = await updateRssFeed(feed.id, { enabled: !feed.enabled });
      setFeeds((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setPendingId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteFeed) return;

    const feed = pendingDeleteFeed;
    setPendingDeleteFeed(null);
    setPendingId(feed.id);
    setMessage(null);
    setError(null);
    try {
      await deleteRssFeed(feed.id);
      setFeeds((prev) => prev.filter((f) => f.id !== feed.id));
      setMessage(`已删除「${feed.name}」`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setPendingId(null);
    }
  }

  const atLimit = feeds.length >= MAX_RSS_FEEDS;

  return (
    <section className="card">
      <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/40 to-orange-50/20 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">RSS 订阅源</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Worker 按各 Feed 的采集间隔独立拉取；未单独配置时使用全局默认（
          {formatMinutesLabel(
            rssDefaultIntervalMinutes
            ?? DEFAULT_COLLECTION_SCHEDULE.rssDefaultIntervalMinutes,
          )}
          ）。
          系统内置源仅可停用或调整间隔，不可删除。
        </p>        <p className="mt-1 text-xs text-slate-400">
          已配置 {feeds.length} / {MAX_RSS_FEEDS} 个
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {feeds.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">暂无 RSS Feed，请添加或运行 db:seed 初始化默认源。</p>
        ) : (
          feeds.map((feed) => (
            <div key={feed.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{feed.name}</span>
                  {feed.isBuiltin && (
                    <Badge variant="blue">系统内置</Badge>
                  )}
                  <Badge variant={feed.enabled ? 'green' : 'slate'}>
                    {feed.enabled ? '已启用' : '已停用'}
                  </Badge>
                  <span className="text-xs text-slate-400">{feed.domain}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500" title={feed.url}>
                  {feed.url}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  上次采集：{formatLastFetchedAt(feed.lastFetchedAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <span>间隔</span>
                  <select
                    value={feed.fetchIntervalMinutes ?? ''}
                    onChange={(e) => handleIntervalChange(feed, e.target.value)}
                    disabled={pendingId === feed.id}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                    title={formatFeedIntervalLabel(feed.fetchIntervalMinutes)}
                  >
                    <option value="">
                      全局默认
                    </option>                    {RSS_FEED_INTERVAL_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {formatMinutesLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(feed)}
                  disabled={pendingId === feed.id}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {feed.enabled ? '停用' : '启用'}
                </button>
                {!feed.isBuiltin && (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteFeed(feed)}
                    disabled={pendingId === feed.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    删除
                  </button>
                )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="space-y-4 border-t border-slate-100 p-5">
        <h3 className="text-sm font-medium text-slate-800">添加 Feed</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">名称</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如 Reuters World"
              required
              disabled={loading || atLimit}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">语种</span>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="en / zh"
              disabled={loading || atLimit}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Feed URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/rss.xml"
            required
            disabled={loading || atLimit}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          />
        </label>
        {atLimit && (
          <p className="text-xs text-amber-600">已达上限，请先删除不需要的 Feed。</p>
        )}
        <button
          type="submit"
          disabled={loading || atLimit}
          className="btn-primary px-5 disabled:opacity-50"
        >
          {loading ? '验证并添加中…' : '添加 Feed'}
        </button>
      </form>

      {(message || error) && (
        <div className="border-t border-slate-100 px-5 py-3">
          {message && <p className="text-sm text-slate-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteFeed)}
        title="确定删除这个 RSS Feed？"
        description={
          pendingDeleteFeed
            ? `删除「${pendingDeleteFeed.name}」后，后续采集将不再读取这个来源。`
            : undefined
        }
        confirmLabel="删除"
        cancelLabel="保留"
        variant="destructive"
        loading={Boolean(pendingDeleteFeed && pendingId === pendingDeleteFeed.id)}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteFeed(null)}
      />
    </section>
  );
}
