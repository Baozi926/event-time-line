import type { CollectionRun } from '@event-time-line/shared';
import { ArticleList } from './CollectionRunArticles';
import {
  RUN_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  formatDuration,
  formatTime,
} from './collectionLabels';

export function CollectionRunDetail({ run }: { run: CollectionRun }) {
  const articles = run.metadata?.articles ?? [];
  const truncated = run.articlesFound > articles.length;

  const stats = [
    { label: '发现文章', value: run.articlesFound },
    {
      label: '新增入库',
      value: run.articlesNew,
      highlight: run.articlesNew > 0,
    },
    { label: '新建事件', value: run.eventsCreated },
    { label: '自动晋升', value: run.eventsPromoted },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            STATUS_STYLES[run.status] ??
            'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'
          }`}
        >
          {STATUS_LABELS[run.status] ?? run.status}
        </span>
        {run.sourceType && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {SOURCE_TYPE_LABELS[run.sourceType] ?? run.sourceType}
          </span>
        )}
        {run.category && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {run.category}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {stat.label}
            </p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                stat.highlight ? 'text-emerald-700' : 'text-slate-900'
              }`}
            >
              {stat.highlight && stat.value > 0 ? `+${stat.value}` : stat.value}
            </p>
          </div>
        ))}
      </div>

      <dl className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-slate-500">开始时间</dt>
          <dd className="mt-1 text-sm tabular-nums text-slate-900">
            {formatTime(run.startedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">结束时间</dt>
          <dd className="mt-1 text-sm tabular-nums text-slate-900">
            {formatTime(run.finishedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">耗时</dt>
          <dd className="mt-1 text-sm tabular-nums text-slate-900">
            {formatDuration(run.startedAt, run.finishedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">任务类型</dt>
          <dd className="mt-1 text-sm text-slate-900">
            {RUN_TYPE_LABELS[run.runType] ?? run.runType}
          </dd>
        </div>
      </dl>

      {run.errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {run.errorMessage}
        </div>
      )}

      {run.metadata?.rssFeeds && run.metadata.rssFeeds.length > 0 && (
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">RSS 订阅明细</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              本次任务各订阅源的采集结果
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="min-w-[12rem] px-5 py-3.5">订阅源</th>
                  <th className="whitespace-nowrap px-5 py-3.5">状态</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-right">发现</th>
                  <th className="min-w-[8rem] px-5 py-3.5">错误</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {run.metadata.rssFeeds.map((feed) => (
                  <tr key={feed.feedUrl}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{feed.feedName}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-400">{feed.feedUrl}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[feed.status] ??
                          'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'
                        }`}
                      >
                        {STATUS_LABELS[feed.status] ?? feed.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-600">
                      {feed.articlesFound}
                    </td>
                    <td className="max-w-[16rem] truncate px-5 py-3.5 text-red-600">
                      {feed.errorMessage ?? (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">采集内容</h2>
          {articles.length > 0 && (
            <span className="text-xs text-slate-400">
              显示 {articles.length} 条
              {truncated && ` / 共 ${run.articlesFound} 条`}
            </span>
          )}
        </div>

        <div className="p-5">
          {articles.length > 0 ? (
            <ArticleList articles={articles} />
          ) : run.articlesFound > 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              共发现 {run.articlesFound} 条，暂无明细
            </p>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              未发现新内容
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
