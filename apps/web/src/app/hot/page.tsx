import Link from 'next/link';
import { getCandidates, getHotTrends } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { HotTrendBoards } from './HotTrendBoards';
import { HotSpotEvents } from './HotSpotEvents';

export const dynamic = 'force-dynamic';

const SOURCE_LABELS = {
  live: '实时拉取',
  cache: '采集缓存',
} as const;

export default async function HotPage({
  searchParams,
}: {
  searchParams: Promise<{ live?: string }>;
}) {
  const { live: liveParam } = await searchParams;
  const live = liveParam === 'true';

  let hotTrends: Awaited<ReturnType<typeof getHotTrends>> | null = null;
  let candidates: Awaited<ReturnType<typeof getCandidates>> | null = null;
  let hotError: string | null = null;
  let candidatesError: string | null = null;

  const [hotResult, candidatesResult] = await Promise.allSettled([
    getHotTrends({ live }),
    getCandidates({ limit: 12, offset: 0 }),
  ]);

  if (hotResult.status === 'fulfilled') {
    hotTrends = hotResult.value;
  } else {
    hotError =
      hotResult.reason instanceof Error
        ? hotResult.reason.message
        : '加载失败';
  }

  if (candidatesResult.status === 'fulfilled') {
    candidates = candidatesResult.value;
  } else {
    candidatesError =
      candidatesResult.reason instanceof Error
        ? candidatesResult.reason.message
        : '加载失败';
  }

  const hasBoardData =
    hotTrends?.boards.some((board) => board.items.length > 0) ?? false;

  const boardCount =
    hotTrends?.boards.filter((b) => b.items.length > 0).length ?? 0;

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        variant="playful"
        eyebrow="全网热搜一览"
        title="热点榜"
        description="多平台实时热榜与系统聚合的高热度事件，一眼看清哪里在冒火。"
        stats={[
          {
            label: '平台榜',
            value: boardCount,
            accent: 'brand',
          },
          {
            label: '系统热点',
            value: candidates?.total ?? '-',
            accent: 'orange',
          },
        ]}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
          <div>
            <h2 className="text-base font-bold text-slate-900">平台热榜</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              微博、知乎、百度等平台的当前热搜条目
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hotTrends && (
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                {SOURCE_LABELS[hotTrends.source]} ·{' '}
                {new Date(hotTrends.fetchedAt).toLocaleString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            <Link
              href={live ? '/hot' : '/hot?live=true'}
              className="btn-secondary text-xs"
            >
              {live ? '返回缓存' : '实时刷新'}
            </Link>
          </div>
        </div>

        {!hotTrends?.enabled && (
          <Alert variant="warning">
            热榜采集已关闭。可在系统设置 → 数据源中启用「多平台热榜」。
          </Alert>
        )}

        {hotError && (
          <Alert variant="warning">无法加载热榜：{hotError}</Alert>
        )}

        {hotTrends && !hasBoardData && hotTrends.enabled && !hotError && (
          <EmptyState
            title="暂无热榜数据"
            description="先跑一轮采集，或者点「实时刷新」直接从 NewsNow 拉一把"
          />
        )}

        {hotTrends && hasBoardData && (
          <HotTrendBoards boards={hotTrends.boards} />
        )}
      </section>

      {candidatesError && (
        <Alert variant="warning">
          无法加载系统热点：{candidatesError}
        </Alert>
      )}

      {candidates && (
        <HotSpotEvents
          candidates={candidates.candidates}
          listPath="/hot"
        />
      )}
    </div>
  );
}
