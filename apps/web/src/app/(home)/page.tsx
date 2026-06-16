import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMySubscriptions, getTrackingHistory, LIST_PAGE_SIZE } from '@/lib/api';
import { getMeServer } from '@/lib/auth';
import { TrackedEventList } from '@/components/TrackedEventList';
import { buildFollowingListPath } from '@/lib/followingNavigation';
import { FilterListLayout } from '@/components/filters/FilterListLayout';
import { ListFilterPanel } from '@/components/filters/ListFilterPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { FollowingTabs } from '@/components/following/FollowingTabs';
import { TrackingHistoryTable } from '@/components/following/TrackingHistoryTable';
import { TrackingHistoryFilters } from '@/components/following/TrackingHistoryFilters';

export const dynamic = 'force-dynamic';

const SORT_OPTIONS = [
  { value: 'subscribed', label: '最近关注' },
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
  const user = await getMeServer();
  const params = await searchParams;
  const isAdmin = user?.role === 'admin';
  const view =
    isAdmin && params.view === 'history' ? 'history' : 'active';
  const { category, country, language, sort: sortParam, action } = params;
  const sort = sortParam ?? 'subscribed';
  const actionFilter =
    action === 'tracked' || action === 'untracked' ? action : undefined;

  if (!user) {
    return (
      <div className="min-w-0 space-y-4">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50 to-orange-50 px-5 py-6 shadow-sm sm:px-7">
          <div className="relative">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              我的关注
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              登录后可以把感兴趣的热点放进自己的关注列表，随时回来查看更新。
            </p>
          </div>
        </section>

        <EmptyState
          title="请先登录"
          description="注册或登录账号后，就能在候选池、热点页关注自己喜欢的新闻了"
        >
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn-primary">
              登录
            </Link>
            <Link href="/register" className="btn-secondary">
              注册
            </Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  if (!isAdmin && params.view === 'history') {
    redirect('/');
  }

  let eventsData: Awaited<ReturnType<typeof getMySubscriptions>> | null = null;
  let historyData: Awaited<ReturnType<typeof getTrackingHistory>> | null = null;
  let eventsError: string | null = null;
  let historyError: string | null = null;

  const [eventsResult, historyResult] = await Promise.allSettled([
    getMySubscriptions({
      sort,
      category,
      country,
      language,
      limit: view === 'active' ? LIST_PAGE_SIZE : 1,
      offset: 0,
    }),
    isAdmin
      ? getTrackingHistory({
          action: actionFilter,
          limit: view === 'history' ? HISTORY_PAGE_SIZE : 1,
          offset: 0,
        })
      : Promise.resolve(null),
  ]);

  if (eventsResult.status === 'fulfilled') {
    eventsData = eventsResult.value;
  } else {
    eventsError =
      eventsResult.reason instanceof Error
        ? eventsResult.reason.message
        : '加载失败';
  }

  if (historyResult.status === 'fulfilled' && historyResult.value) {
    historyData = historyResult.value;
  } else if (historyResult.status === 'rejected') {
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
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50 to-orange-50 px-5 py-6 shadow-sm sm:px-7">
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-200/40 blur-2xl" />
        <div className="absolute -bottom-16 left-12 h-40 w-40 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-brand-700 shadow-sm">
              你的私人雷达
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              我的关注
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              这里只显示你关注的事件，和全站系统追踪无关。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/75 p-2 shadow-sm backdrop-blur">
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-center">
              <p className="text-2xl font-black tabular-nums text-brand-700">
                {eventsData?.total ?? '-'}
              </p>
              <p className="mt-0.5 text-xs font-medium text-brand-700/70">关注中</p>
            </div>
            {isAdmin && (
              <div className="rounded-xl bg-orange-50 px-4 py-3 text-center">
                <p className="text-2xl font-black tabular-nums text-orange-600">
                  {historyData?.total ?? '-'}
                </p>
                <p className="mt-0.5 text-xs font-medium text-orange-700/70">系统操作</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <FollowingTabs
        activeView={view}
        activeCount={eventsData?.total}
        historyCount={historyData?.total}
        showHistory={isAdmin}
      />

      {error && (
        <Alert variant="warning">
          无法连接 API：{error}。请确认 API 服务已启动。
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
              defaultSort="subscribed"
              total={eventsData.total}
            />
          }
        >
          {eventsData.events.length === 0 && (
            <EmptyState
              title={hasFilters ? '没有匹配的事件' : '还没有关注任何事件'}
              description={
                hasFilters
                  ? '换个筛选条件试试'
                  : '去候选池或热点页挑几个感兴趣的新闻吧'
              }
            >
              {!hasFilters && (
                <p className="text-sm text-slate-500">
                  到{' '}
                  <Link
                    href="/candidates"
                    className="font-medium text-brand-600 hover:underline"
                  >
                    候选池
                  </Link>{' '}
                  或{' '}
                  <Link href="/hot" className="font-medium text-brand-600 hover:underline">
                    热点
                  </Link>{' '}
                  开始关注
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

      {view === 'history' && historyData && isAdmin && (
        <div className="space-y-4">
          <TrackingHistoryFilters
            activeAction={actionFilter}
            total={historyData.total}
          />

          {historyData.entries.length === 0 ? (
            <EmptyState
              title="暂无系统操作记录"
              description="管理员在候选池纳入系统追踪或停止追踪后，记录将显示在这里"
            />
          ) : (
            <TrackingHistoryTable entries={historyData.entries} />
          )}
        </div>
      )}
    </div>
  );
}
