import Link from 'next/link';
import { getEvent, getEventArticles, getEventSnapshots } from '@/lib/api';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  developing: '发展中',
  settled: '已平息',
  long_term: '长期影响',
  disputed: '存疑',
  candidate: '候选',
  tracking: '关注中',
  archived: '已归档',
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let event: Awaited<ReturnType<typeof getEvent>> | null = null;
  let articles: Awaited<ReturnType<typeof getEventArticles>> | null = null;
  let snapshots: Awaited<ReturnType<typeof getEventSnapshots>> | null = null;
  let error: string | null = null;

  try {
    [event, articles, snapshots] = await Promise.all([
      getEvent(slug),
      getEventArticles(slug),
      getEventSnapshots(slug),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : '加载失败';
  }

  if (error || !event) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error ?? '事件不存在'}
      </div>
    );
  }

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← 返回列表
      </Link>

      <article className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            热度 {event.heatScore.toFixed(0)}
          </span>
          <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">
            {STATUS_LABELS[event.trackingStatus] ?? event.trackingStatus}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
            {STATUS_LABELS[event.status] ?? event.status}
          </span>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-slate-900">{event.title}</h1>
        <p className="mb-4 text-slate-600">{event.summary}</p>
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <span>{event.sourceCount} 个来源</span>
          <span>{event.articleCount} 篇文章</span>
          <span>
            首次发现：{new Date(event.firstSeenAt).toLocaleDateString('zh-CN')}
          </span>
          <span>
            最近更新：{new Date(event.lastUpdatedAt).toLocaleString('zh-CN')}
          </span>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          信息来源于公开报道，可能随事态发展变化。点击来源链接查看原文。
        </p>
      </article>

      {snapshots && snapshots.snapshots.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">每日快照</h2>
          <div className="space-y-3">
            {snapshots.snapshots.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-800">{s.snapshotDate}</span>
                  <span className="text-xs text-slate-400">
                    热度 {s.heatScore.toFixed(0)} · 新增 {s.newArticles24h} 篇
                  </span>
                </div>
                {s.summary && (
                  <p className="text-sm text-slate-600">{s.summary}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">来源文章</h2>
          <Link
            href={`/events/${slug}/articles`}
            className="text-sm text-brand-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        <div className="space-y-3">
          {articles?.articles.slice(0, 10).map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-500"
            >
              <h3 className="mb-1 font-medium text-slate-900">{a.title}</h3>
              <div className="flex gap-3 text-xs text-slate-400">
                <span>{a.source?.name ?? '未知来源'}</span>
                <span>
                  {new Date(a.publishedAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
