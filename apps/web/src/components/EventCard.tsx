import Link from 'next/link';
import type { Event } from '@event-time-line/shared';

const STATUS_LABELS: Record<string, string> = {
  developing: '发展中',
  settled: '已平息',
  long_term: '长期影响',
  disputed: '存疑',
};

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          热度 {event.heatScore.toFixed(0)}
        </span>
        {event.categoryHint && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
            {event.categoryHint}
          </span>
        )}
        <span className="text-xs text-slate-400">
          {STATUS_LABELS[event.status] ?? event.status}
        </span>
      </div>
      <h2 className="mb-2 text-lg font-semibold leading-snug text-slate-900">
        {event.title}
      </h2>
      <p className="mb-3 line-clamp-2 text-sm text-slate-600">{event.summary}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>{event.sourceCount} 个来源</span>
        <span>{event.articleCount} 篇文章</span>
        <span>
          更新于{' '}
          {new Date(event.lastUpdatedAt).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </Link>
  );
}
