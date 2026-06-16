import Link from 'next/link';
import { getEvents, getTrackingHistory, LIST_PAGE_SIZE } from '@/lib/api';
import { TrackedEventList } from '@/components/TrackedEventList';
import { buildFollowingListPath } from '@/lib/followingNavigation';
import { FilterListLayout } from '@/components/filters/FilterListLayout';
import { ListFilterPanel } from '@/components/filters/ListFilterPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { FollowingTabs } from '@/components/following/FollowingTabs';
import { TrackingHistoryTable } from '@/components/following/TrackingHistoryTable';
import { TrackingHistoryFilters } from '@/components/following/TrackingHistoryFilters';

export const dynamic = 'force-dynamic';

const SORT_OPTIONS = [
  { value: 'heat', label: '按热度' },
  { value: 'recent', label: '最新发现' },
  { value: 'updated', label: '最近更新' },
] as const;

const HISTORY_PAGE_SIZE = 50;

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    action?: string;
    category?: string;
    country?: string;
    language?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const view = params.view === 'history' ? 'history' : 'active';
  const { category, country, language, sort: sortParam, action } = params;
  const sort = sortParam ?? 'heat';
  const actionFilter =
    action === 'tracked' || action === 'untracked' ? action : undefined;

  let eventsData: Awaited<ReturnType<typeof getEvents>> | null = null;
  let historyData: Awaited<ReturnType<typeof getTrackingHistory>> | null = null;
  let eventsError: string | null = null;
  let historyError: string | null = null;

  const [eventsResult, historyResult] = await Promise.allSettled([
    getEvents({
      sort,
      category,
      country,
      language,
      limit: view === 'active' ? LIST_PAGE_SIZE : 1,
      offset: 0,
    }),
    getTrackingHistory({
      action: actionFilter,
      limit: view === 'history' ? HISTORY_PAGE_SIZE : 1,
      offset: 0,
    }),
  ]);

  if (eventsResult.status === 'fulfilled') {
    eventsData = eventsResult.value;
  } else {
    eventsError =
      eventsResult.reason instanceof Error
        ? eventsResult.reason.message
        : '加载失败';
  }

  if (historyResult.status === 'fulfilled') {
    historyData = historyResult.value;
  } else {
    historyError =
      historyResult.reason instanceof Error
        ? historyResult.reason.message
        : '加载失败';
  }

  const error = view === 'history' ? historyError : eventsError;

  const hasFilters = Boolean(category || country || language);
  const listPath = buildFollowingListPath({ category, country, language, sort });

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="我的关注"
        description="管理正在追踪的热点事件，查看关注与取消关注的操作记录"
        bordered={false}
        className="mb-0"
      />

      <FollowingTabs
        activeView={view}
        activeCount={eventsData?.total}
        historyCount={historyData?.total}
      />

      {error && (
        <Alert variant="warning">
          无法连接 API：{error}。请确认 API 服务已启动且已运行数据采集。
        </Alert>
      )}

      {view === 'active' && eventsData && (
        <FilterListLayout
          sidebar={
            <ListFilterPanel
              basePath="/"
              categories={eventsData.facets.categories}
              countries={eventsData.facets.countries}
              languages={eventsData.facets.languages}
              activeCategory={category}
              activeCountry={country}
              activeLanguage={language}
              activeSort={sort}
              sortOptions={[...SORT_OPTIONS]}
              total={eventsData.total}
            />
          }
        >
          {eventsData.events.length === 0 && (
            <EmptyState
              title={hasFilters ? '没有匹配的事件' : '暂无关注中的事件'}
              description={
                hasFilters
                  ? '尝试调整筛选条件，或清除筛选查看全部事件'
                  : '运行采集任务后，符合条件的事件将自动出现在这里'
              }
            >
              {!hasFilters && (
                <p className="text-sm text-slate-500">
                  运行{' '}
                  <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                    pnpm worker:run
                  </code>{' '}
                  开始采集，或到{' '}
                  <Link
                    href="/candidates"
                    className="font-medium text-brand-600 hover:underline"
                  >
                    候选池
                  </Link>{' '}
                  手动加入关注
                </p>
              )}
            </EmptyState>
          )}

          {eventsData.events.length > 0 && (
            <TrackedEventList
              events={eventsData.events}
              total={eventsData.total}
              listPath={listPath}
              sort={sort}
              filters={{ category, country, language }}
            />
          )}
        </FilterListLayout>
      )}

      {view === 'history' && historyData && (
        <div className="space-y-4">
          <TrackingHistoryFilters
            activeAction={actionFilter}
            total={historyData.total}
          />

          {historyData.entries.length === 0 ? (
            <EmptyState
              title="暂无操作记录"
              description="在候选池加入关注或取消关注事件后，操作记录将显示在这里"
            />
          ) : (
            <TrackingHistoryTable entries={historyData.entries} />
          )}
        </div>
      )}
    </div>
  );
}
