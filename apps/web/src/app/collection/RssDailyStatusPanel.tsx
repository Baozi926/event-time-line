import Link from 'next/link';
import type { RssCollectionDailySummary } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatTime, STATUS_LABELS, STATUS_STYLES } from './collectionLabels';

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums leading-tight ${
          highlight ? 'text-emerald-700' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function RssDailyStatusPanel({
  summary,
}: {
  summary: RssCollectionDailySummary;
}) {
  const enabledFeeds = summary.feeds.filter((feed) => feed.enabled);
  const disabledFeeds = summary.feeds.filter((feed) => !feed.enabled);
  const activeFeeds = enabledFeeds.filter((feed) => feed.todayRuns > 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">
            {formatDateLabel(summary.date)} · 全量任务执行 {summary.pipelineRuns} 次
          </p>
          {summary.pipelineRuns > 0 && (
            <p className="text-xs text-slate-500">
              已启用 {enabledFeeds.length} 个订阅源
              {activeFeeds.length > 0 && ` · 今日活跃 ${activeFeeds.length} 个`}
            </p>
          )}
        </div>
        <Link href="/settings" className="btn-secondary inline-flex shrink-0 px-3 py-1.5 text-xs">
          管理订阅
        </Link>
      </div>

      {summary.pipelineRuns > 0 && (
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-5 py-4 sm:grid-cols-4">
          <SummaryStat label="今日拉取" value={summary.todayArticlesFound} />
          <SummaryStat
            label="今日新增"
            value={summary.todayArticlesNew}
            highlight={summary.todayArticlesNew > 0}
          />
          <SummaryStat label="活跃订阅" value={activeFeeds.length} />
          <SummaryStat
            label="失败订阅"
            value={enabledFeeds.filter((feed) => feed.failCount > 0).length}
          />
        </div>
      )}

      {enabledFeeds.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="暂无已启用的 RSS 订阅"
            description="前往系统设置添加或启用 RSS 源"
          />
        </div>
      ) : summary.pipelineRuns === 0 ? (
        <div className="p-5">
          <EmptyState
            title="今日尚未执行 RSS 采集"
            description="触发全量采集后，将在此显示各订阅源同步的新闻数量与采集状态"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="min-w-[12rem] px-5 py-3.5">订阅源</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right" title="今日从该 RSS 拉取到的文章条数">
                  今日拉取
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right" title="今日首次入库的新文章">
                  今日新增
                </th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">采集次数</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">成功</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">失败</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">跳过</th>
                <th className="whitespace-nowrap px-5 py-3.5">最近状态</th>
                <th className="whitespace-nowrap px-5 py-3.5">最近时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enabledFeeds.map((feed) => (
                <tr key={feed.feedUrl} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900">{feed.feedName}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">{feed.feedUrl}</div>
                    {feed.lastError && feed.lastStatus === 'failed' && (
                      <div
                        className="mt-1 line-clamp-2 text-xs text-red-600"
                        title={feed.lastError}
                      >
                        {feed.lastError}
                      </div>
                    )}
                    {feed.lastSkippedReason && feed.lastStatus === 'skipped' && (
                      <div
                        className="mt-1 line-clamp-2 text-xs text-amber-700"
                        title={feed.lastSkippedReason}
                      >
                        {feed.lastSkippedReason}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-700">
                    {feed.todayArticlesFound}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums">
                    {feed.todayArticlesNew > 0 ? (
                      <span className="font-medium text-emerald-700">
                        +{feed.todayArticlesNew}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-700">
                    {feed.todayRuns}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-emerald-700">
                    {feed.successCount}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-red-600">
                    {feed.failCount}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-amber-700">
                    {feed.skippedCount}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    {feed.lastStatus ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[feed.lastStatus] ??
                          'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'
                        }`}
                      >
                        {STATUS_LABELS[feed.lastStatus] ?? feed.lastStatus}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-500">
                    {feed.lastAt ? formatTime(feed.lastAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {disabledFeeds.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="mb-2 text-xs font-medium text-slate-500">已停用订阅</p>
          <div className="flex flex-wrap gap-2">
            {disabledFeeds.map((feed) => (
              <Badge key={feed.feedUrl} variant="slate">
                {feed.feedName}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
