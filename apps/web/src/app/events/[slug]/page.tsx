import Link from 'next/link';
import { getEvent, getEventArticles, getEventSnapshots } from '@/lib/api';
import { resolveCandidatesReturnTo } from '@/app/candidates/candidateNavigation';
import { resolveFollowingReturnTo } from '@/lib/followingNavigation';
import { BackLink } from '@/components/ui/BackLink';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EventUntrackButton } from '@/components/EventUntrackButton';

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { slug } = await params;
  const { returnTo } = await searchParams;

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
    return <Alert variant="error">{error ?? '事件不存在'}</Alert>;
  }

  const backHref =
    event.trackingStatus === 'candidate'
      ? resolveCandidatesReturnTo(returnTo)
      : resolveFollowingReturnTo(returnTo);
  const backLabel =
    event.trackingStatus === 'candidate' ? '返回候选池' : '返回我的关注';

  return (
    <div className="space-y-8">
      <BackLink href={backHref}>{backLabel}</BackLink>

      <article className="card p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant="brand">热度 {event.heatScore.toFixed(0)}</Badge>
          <Badge variant="green">
            {STATUS_LABELS[event.trackingStatus] ?? event.trackingStatus}
          </Badge>
          <Badge variant="slate">
            {STATUS_LABELS[event.status] ?? event.status}
          </Badge>
        </div>
        <h1 className="mb-4 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
          {event.title}
        </h1>
        {event.summary && (
          <p className="mb-5 text-base leading-relaxed text-slate-600">
            {event.summary}
          </p>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
          <span>{event.sourceCount} 个来源</span>
          <span>{event.articleCount} 篇文章</span>
          <span>
            首次发现：{new Date(event.firstSeenAt).toLocaleDateString('zh-CN')}
          </span>
          <span>
            最近更新：{new Date(event.lastUpdatedAt).toLocaleString('zh-CN')}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            信息来源于公开报道，可能随事态发展变化。点击来源链接查看原文。
          </p>
          {event.trackingStatus === 'tracking' && (
            <EventUntrackButton slug={event.slug} redirectTo="/" />
          )}
        </div>
      </article>

      {snapshots && snapshots.snapshots.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">
            每日快照
          </h2>
          <div className="space-y-3">
            {snapshots.snapshots.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="mb-1 flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-800">
                    {s.snapshotDate}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    热度 {s.heatScore.toFixed(0)} · 新增 {s.newArticles24h} 篇
                  </span>
                </div>
                {s.summary && (
                  <p className="text-sm leading-relaxed text-slate-600">
                    {s.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            来源文章
          </h2>
          <Link
            href={`/events/${slug}/articles`}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
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
              className="card-hover block p-4"
            >
              <h3 className="mb-1 font-medium leading-snug text-slate-900">
                {a.title}
              </h3>
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
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
