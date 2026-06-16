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

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        title="热点榜"
        description="多平台实时热榜与系统聚合的高热度事件"
        bordered={false}
        className="mb-0"
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              平台热榜
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              微博、知乎、百度等平台的当前热搜条目
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hotTrends && (
              <span className="text-xs text-slate-400">
                数据来源：{SOURCE_LABELS[hotTrends.source]} ·{' '}
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
            description="请先运行全量采集任务，或点击「实时刷新」直接从 NewsNow 拉取"
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
