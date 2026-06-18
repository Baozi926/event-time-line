import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getKeywordSubscriptionEvents,
  getMyKeywordSubscriptions,
  getMySubscriptions,
  getTrackingHistory,
  LIST_PAGE_SIZE,
} from '@/lib/api';
import { getMeServer } from '@/lib/auth';
import { TrackedEventList } from '@/components/TrackedEventList';
import { buildFollowingListPath } from '@/lib/followingNavigation';
import { FilterListLayout } from '@/components/filters/FilterListLayout';
import { ListFilterPanel } from '@/components/filters/ListFilterPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import {
  FollowingTabs,
  type FollowingView,
} from '@/components/following/FollowingTabs';
import { TrackingHistoryTable } from '@/components/following/TrackingHistoryTable';
import { TrackingHistoryFilters } from '@/components/following/TrackingHistoryFilters';
import { KeywordSubscriptionPanel } from '@/components/following/KeywordSubscriptionPanel';
import { KeywordEventList } from '@/components/following/KeywordEventList';

export const dynamic = 'force-dynamic';

const SORT_OPTIONS = [
  { value: 'subscribed', label: '最近关注' },
  { value: 'heat', label: '按热度' },
  { value: 'recent', label: '最新发现' },
  { value: 'updated', label: '最近更新' },
] as const;

const HISTORY_PAGE_SIZE = 50;

function resolveFollowingView(
  viewParam: string | undefined,
  isAdmin: boolean,
): FollowingView {
  if (isAdmin && viewParam === 'history') return 'history';
  if (viewParam === 'keywords') return 'keywords';
  return 'events';
}

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
  const view = resolveFollowingView(params.view, isAdmin);
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
  let keywordData: Awaited<ReturnType<typeof getMyKeywordSubscriptions>> | null = null;
  let keywordEventsData: Awaited<ReturnType<typeof getKeywordSubscriptionEvents>> | null = null;
  let historyData: Awaited<ReturnType<typeof getTrackingHistory>> | null = null;
  let eventsError: string | null = null;
  let keywordError: string | null = null;
  let historyError: string | null = null;

  const [eventsResult, keywordSubsResult, keywordEventsResult, historyResult] =
    await Promise.allSettled([
      getMySubscriptions({
        sort,
        category,
        country,
        language,
        limit: view === 'events' ? LIST_PAGE_SIZE : 1,
        offset: 0,
      }),
      getMyKeywordSubscriptions(),
      view === 'keywords'
        ? getKeywordSubscriptionEvents({ sort: 'heat', limit: LIST_PAGE_SIZE, offset: 0 })
        : Promise.resolve(null),
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

  if (keywordSubsResult.status === 'fulfilled') {
    keywordData = keywordSubsResult.value;
  } else {
    keywordError =
      keywordSubsResult.reason instanceof Error
        ? keywordSubsResult.reason.message
        : '加载失败';
  }

  if (keywordEventsResult.status === 'fulfilled' && keywordEventsResult.value) {
    keywordEventsData = keywordEventsResult.value;
  } else if (keywordEventsResult.status === 'rejected' && view === 'keywords') {
    keywordError =
      keywordEventsResult.reason instanceof Error
        ? keywordEventsResult.reason.message
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

  const error =
    view === 'history'
      ? historyError
      : view === 'keywords'
        ? keywordError
        : eventsError;
  const hasFilters = Boolean(category || country || language);
  const listPath = buildFollowingListPath({ category, country, language, sort });
  const keywordCount = keywordData?.keywords.length ?? 0;
  const hasKeywordSubscriptions = keywordCount > 0;

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
              手动关注具体事件，或用关键词订阅主题，相关内容会分开展示在这里。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/75 p-2 shadow-sm backdrop-blur">
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-center">
              <p className="text-2xl font-black tabular-nums text-brand-700">
                {eventsData?.total ?? '-'}
              </p>
              <p className="mt-0.5 text-xs font-medium text-brand-700/70">事件关注</p>
            </div>
            <div className="rounded-xl bg-orange-50 px-4 py-3 text-center">
              <p className="text-2xl font-black tabular-nums text-orange-600">
                {keywordData ? keywordCount : '-'}
              </p>
              <p className="mt-0.5 text-xs font-medium text-orange-700/70">关键词</p>
            </div>
          </div>
        </div>
      </section>

      <FollowingTabs
        activeView={view}
        eventCount={eventsData?.total}
        keywordCount={keywordCount}
        historyCount={historyData?.total}
        showHistory={isAdmin}
      />

      {error && (
        <Alert variant="warning">
          无法连接 API：{error}。请确认 API 服务已启动。
        </Alert>
      )}

      {view === 'events' && eventsData && (
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

      {view === 'keywords' && keywordData && (
        <div className="space-y-4">
          <KeywordSubscriptionPanel data={keywordData} />

          {hasKeywordSubscriptions && keywordEventsData ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">关键词推荐</h2>
              <p className="text-sm text-slate-500">
                根据你关注的关键词，经主题分类后自动匹配的相关事件
              </p>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  {keywordEventsData.total} 条
                </span>
              </div>

              {keywordEventsData.events.length === 0 ? (
                <EmptyState
                  title="暂无匹配事件"
                  description="采集到新内容后会自动出现在这里，也可以先去候选池看看"
                />
              ) : (
                <KeywordEventList
                  events={keywordEventsData.events}
                  total={keywordEventsData.total}
                  sort="heat"
                />
              )}
            </section>
          ) : (
            !hasKeywordSubscriptions && (
              <EmptyState
                title="还没有关注关键词"
                description="在上方输入你关心的词，系统会自动把相关事件收进推荐列表"
              />
            )
          )}
        </div>
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
              description="用户关注候选或热榜条目、管理员归档事件后，记录将显示在这里"
            />
          ) : (
            <TrackingHistoryTable entries={historyData.entries} />
          )}
        </div>
      )}
    </div>
  );
}
