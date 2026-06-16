import Link from 'next/link';
import type { CollectionRun } from '@event-time-line/shared';
import {
  RUN_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  formatDuration,
  formatTime,
} from './collectionLabels';

export function CollectionRunsTable({ runs }: { runs: CollectionRun[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-5 py-3.5">开始时间</th>
              <th className="whitespace-nowrap px-5 py-3.5">任务</th>
              <th className="whitespace-nowrap px-5 py-3.5">来源</th>
              <th className="whitespace-nowrap px-5 py-3.5">分类</th>
              <th className="whitespace-nowrap px-5 py-3.5">状态</th>
              <th className="whitespace-nowrap px-5 py-3.5 text-right">
                发现
              </th>
              <th className="whitespace-nowrap px-5 py-3.5 text-right">
                新增
              </th>
              <th className="whitespace-nowrap px-5 py-3.5 text-right">
                耗时
              </th>
              <th className="min-w-[8rem] px-5 py-3.5">错误</th>
              <th className="whitespace-nowrap px-5 py-3.5 text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.map((run) => (
              <tr
                key={run.id}
                className={
                  run.status === 'running'
                    ? 'bg-blue-50/40'
                    : 'hover:bg-slate-50/80'
                }
              >
                <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-600">
                  {formatTime(run.startedAt)}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900">
                  {RUN_TYPE_LABELS[run.runType] ?? run.runType}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  {run.sourceType ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {SOURCE_TYPE_LABELS[run.sourceType] ?? run.sourceType}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                  {run.category ?? '—'}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[run.status] ??
                      'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'
                    }`}
                  >
                    {STATUS_LABELS[run.status] ?? run.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-600">
                  {run.articlesFound}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-600">
                  {run.articlesNew > 0 ? (
                    <span className="font-medium text-emerald-700">
                      +{run.articlesNew}
                    </span>
                  ) : (
                    run.articlesNew
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-500">
                  {formatDuration(run.startedAt, run.finishedAt)}
                </td>
                <td
                  className="max-w-[12rem] truncate px-5 py-3.5 text-red-600"
                  title={run.errorMessage}
                >
                  {run.errorMessage ?? (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                  <Link
                    href={`/collection/${run.id}`}
                    className="btn-secondary inline-flex px-3 py-1.5 text-xs"
                  >
                    查看详情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
