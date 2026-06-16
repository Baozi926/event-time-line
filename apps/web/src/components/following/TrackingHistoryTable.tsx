import Link from 'next/link';
import type { TrackingHistoryEntry } from '@event-time-line/shared';
import {
  ACTION_LABELS,
  ACTION_STYLES,
  SOURCE_LABELS,
  TRACKING_STATUS_LABELS,
  formatTime,
} from './trackingHistoryLabels';

export function TrackingHistoryTable({
  entries,
}: {
  entries: TrackingHistoryEntry[];
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-5 py-3.5">时间</th>
              <th className="whitespace-nowrap px-5 py-3.5">操作</th>
              <th className="px-5 py-3.5">事件</th>
              <th className="whitespace-nowrap px-5 py-3.5">来源</th>
              <th className="whitespace-nowrap px-5 py-3.5">当前状态</th>
              <th className="whitespace-nowrap px-5 py-3.5 text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-600">
                  {formatTime(entry.createdAt)}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ACTION_STYLES[entry.action]
                    }`}
                  >
                    {ACTION_LABELS[entry.action]}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {entry.event ? (
                    <div>
                      <p className="font-medium text-slate-900">
                        {entry.event.title}
                      </p>
                      {entry.event.categoryHint && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {entry.event.categoryHint}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                  {SOURCE_LABELS[entry.source] ?? entry.source}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                  {entry.event
                    ? (TRACKING_STATUS_LABELS[entry.event.trackingStatus]
                      ?? entry.event.trackingStatus)
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                  {entry.event?.slug ? (
                    <Link
                      href={`/events/${entry.event.slug}`}
                      className="btn-secondary inline-flex px-3 py-1.5 text-xs"
                    >
                      查看事件
                    </Link>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
