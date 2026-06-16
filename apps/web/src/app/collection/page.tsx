import { CollectionTrigger } from './CollectionTrigger';
import { CollectionRunsLazyLoad } from './CollectionRunsLazyLoad';
import { CollectionTabs } from './CollectionTabs';
import { GdeltDailyStatusPanel } from './GdeltDailyStatusPanel';
import { RssDailyStatusPanel } from './RssDailyStatusPanel';
import { COLLECTION_RUNS_PAGE_SIZE } from './constants';

import { getCollectionRuns, getGdeltDailySummary, getRssDailySummary } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';

import type { CollectionRun } from '@event-time-line/shared';

export const dynamic = 'force-dynamic';

function RunStatsInline({
  runs,
  total,
  isRunning,
}: {
  runs: CollectionRun[];
  total: number;
  isRunning: boolean;
}) {
  const totalFound = runs.reduce((sum, r) => sum + r.articlesFound, 0);
  const totalNew = runs.reduce((sum, r) => sum + r.articlesNew, 0);
  const completed = runs.filter((r) => r.status === 'completed').length;
  const failed = runs.filter((r) => r.status === 'failed').length;
  const allLoaded = runs.length >= total;

  const items = [
    { label: '记录', value: total },
    {
      label: '状态',
      value: isRunning ? '运行中' : '空闲',
      highlight: isRunning,
      hint:
        !isRunning && allLoaded
          ? `${completed} 成功 · ${failed} 失败`
          : undefined,
    },
    { label: '发现', value: totalFound },
    { label: '新增', value: totalNew },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">·</span>}
          <span>{item.label}</span>
          <span
            className={`font-semibold tabular-nums ${
              item.highlight ? 'text-blue-600' : 'text-slate-800'
            }`}
          >
            {item.value}
          </span>
          {item.hint && (
            <span className="hidden text-slate-400 sm:inline">({item.hint})</span>
          )}
        </span>
      ))}
    </div>
  );
}

function countRssFailures(
  summary: Awaited<ReturnType<typeof getRssDailySummary>>,
) {
  return summary.feeds.filter((feed) => feed.enabled && feed.failCount > 0).length;
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view =
    params.view === 'rss' ? 'rss' : params.view === 'gdelt' ? 'gdelt' : 'runs';

  let data: Awaited<ReturnType<typeof getCollectionRuns>> | null = null;
  let rssDaily: Awaited<ReturnType<typeof getRssDailySummary>> | null = null;
  let gdeltDaily: Awaited<ReturnType<typeof getGdeltDailySummary>> | null = null;
  let error: string | null = null;
  let rssError: string | null = null;
  let gdeltError: string | null = null;
  try {
    data = await getCollectionRuns({ limit: COLLECTION_RUNS_PAGE_SIZE });
  } catch (e) {
    error = e instanceof Error ? e.message : '加载失败';
  }

  try {
    rssDaily = await getRssDailySummary();
  } catch (e) {
    rssError = e instanceof Error ? e.message : 'RSS 统计加载失败';
  }

  try {
    gdeltDaily = await getGdeltDailySummary();
  } catch (e) {
    gdeltError = e instanceof Error ? e.message : 'GDELT 统计加载失败';
  }

  const activeError =
    view === 'rss' ? rssError : view === 'gdelt' ? gdeltError : error;  const rssFailCount = rssDaily ? countRssFailures(rssDaily) : undefined;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-2 border-b border-slate-200/70 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            采集记录
          </h1>
          {data && data.runs.length > 0 && (
            <RunStatsInline
              runs={data.runs}
              total={data.total}
              isRunning={data.isRunning}
            />
          )}
        </div>
        <CollectionTrigger compact isRunning={data?.isRunning ?? false} />
      </div>

      <CollectionTabs
        activeView={view}
        runsCount={data?.total}
        rssFailCount={rssFailCount}
        gdeltTodayFound={gdeltDaily?.todayArticlesFound}
      />
      {activeError && <Alert variant="warning">{activeError}</Alert>}

      {view === 'runs' && (
        <>
          {data && data.runs.length === 0 && (
            <EmptyState
              title="暂无采集记录"
              description="点击上方按钮开始第一次采集"
            />
          )}
          {data && data.runs.length > 0 && (
            <CollectionRunsLazyLoad initialRuns={data.runs} total={data.total} />
          )}
        </>
      )}

      {view === 'rss' && rssDaily && <RssDailyStatusPanel summary={rssDaily} />}

      {view === 'gdelt' && gdeltDaily && (
        <GdeltDailyStatusPanel summary={gdeltDaily} />
      )}    </div>
  );
}
