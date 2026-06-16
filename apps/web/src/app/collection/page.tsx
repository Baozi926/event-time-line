import { CollectionTrigger } from './CollectionTrigger';
import { CollectionRunsLazyLoad } from './CollectionRunsLazyLoad';
import { CollectionTabs } from './CollectionTabs';
import { GdeltDailyStatusPanel } from './GdeltDailyStatusPanel';
import { RssDailyStatusPanel } from './RssDailyStatusPanel';
import { COLLECTION_RUNS_PAGE_SIZE } from './constants';

import { getCollectionRuns, getGdeltDailySummary, getRssDailySummary } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

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
      <PageHeader
        variant="playful"
        eyebrow="数据管道运转中"
        title="采集记录"
        description="查看采集任务运行情况，需要时也可以手动点一把火。"
        stats={[
          { label: '总记录', value: data?.total ?? '-', accent: 'brand' },
          {
            label: '状态',
            value: data?.isRunning ? '运行中' : '空闲',
            accent: 'orange',
          },
        ]}
      >
        <CollectionTrigger compact isRunning={data?.isRunning ?? false} />
      </PageHeader>

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
              description="点右上角「立即采集」，让第一条记录登场"
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
