import type { GdeltCollectionDailySummary } from '@event-time-line/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  formatTime,
  gdeltCategoryLabel,
  STATUS_LABELS,
  STATUS_STYLES,
} from './collectionLabels';

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

export function GdeltDailyStatusPanel({
  summary,
}: {
  summary: GdeltCollectionDailySummary;
}) {
  const activeCategories = summary.categories.filter((cat) => cat.todayRuns > 0);
  const failedCategories = summary.categories.filter((cat) => cat.failCount > 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">
            {formatDateLabel(summary.date)} · 全量任务执行 {summary.pipelineRuns} 次
          </p>
          {summary.pipelineRuns > 0 && (
            <p className="text-xs text-slate-500">
              共 {summary.categories.length} 个 GDELT 分类
              {activeCategories.length > 0 && ` · 今日活跃 ${activeCategories.length} 个`}
            </p>
          )}
        </div>
      </div>

      {summary.pipelineRuns > 0 && (
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-5 py-4 sm:grid-cols-4">
          <SummaryStat label="今日发现" value={summary.todayArticlesFound} />
          <SummaryStat
            label="今日新增"
            value={summary.todayArticlesNew}
            highlight={summary.todayArticlesNew > 0}
          />
          <SummaryStat label="活跃分类" value={activeCategories.length} />
          <SummaryStat label="失败分类" value={failedCategories.length} />
        </div>
      )}

      {summary.pipelineRuns === 0 ? (
        <div className="p-5">
          <EmptyState
            title="今日尚未执行 GDELT 采集"
            description="触发全量采集后，将在此显示各分类从 GDELT 获取的新闻数量与采集状态"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="min-w-[8rem] px-5 py-3.5">分类</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">今日发现</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">今日新增</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">今日次数</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">成功</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right">失败</th>
                <th className="whitespace-nowrap px-5 py-3.5">最近状态</th>
                <th className="whitespace-nowrap px-5 py-3.5">最近时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.categories.map((cat) => (
                <tr
                  key={cat.category}
                  className={`hover:bg-slate-50/80 ${
                    cat.todayRuns === 0 ? 'text-slate-400' : ''
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900">
                      {gdeltCategoryLabel(cat.category)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">{cat.category}</div>
                    {cat.lastError && cat.lastStatus === 'failed' && (
                      <div
                        className="mt-1 line-clamp-2 text-xs text-red-600"
                        title={cat.lastError}
                      >
                        {cat.lastError}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums">
                    {cat.todayArticlesFound > 0 ? (
                      <span className="font-medium text-slate-800">
                        {cat.todayArticlesFound}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums">
                    {cat.todayArticlesNew > 0 ? (
                      <span className="font-medium text-emerald-700">
                        +{cat.todayArticlesNew}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-700">
                    {cat.todayRuns}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-emerald-700">
                    {cat.successCount}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-red-600">
                    {cat.failCount}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    {cat.lastStatus ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[cat.lastStatus] ??
                          'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'
                        }`}
                      >
                        {STATUS_LABELS[cat.lastStatus] ?? cat.lastStatus}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-500">
                    {cat.lastAt ? formatTime(cat.lastAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
