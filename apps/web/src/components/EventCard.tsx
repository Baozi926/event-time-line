import type { Event } from '@event-time-line/shared';
import { categoryLabel } from '@/lib/filterLabels';
import { Badge } from '@/components/ui/Badge';
import { HeatBar } from '@/components/ui/HeatBar';
import { EventUntrackButton } from '@/components/EventUntrackButton';
import { EventListLink } from '@/components/following/EventListLink';

const STATUS_LABELS: Record<string, string> = {
  developing: '发展中',
  settled: '已平息',
  long_term: '长期影响',
  disputed: '存疑',
};

export function EventCard({
  event,
  listPath = '/',
  onUntrack,
}: {
  event: Event;
  listPath?: string;
  onUntrack?: (eventId: string) => void;
}) {
  return (
    <div className="group relative scroll-mt-24 overflow-hidden rounded-[1.35rem] border border-blue-100/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/70">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-blue-400 to-orange-400" />
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-blue-100/70 blur-2xl transition-opacity duration-200 group-hover:opacity-80" />
      <EventListLink
        eventId={event.id}
        slug={event.slug}
        listPath={listPath}
        className="relative block"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 pr-16">
          <HeatBar score={event.heatScore} />
          {event.categoryHint && (
            <Badge variant="brand">{categoryLabel(event.categoryHint)}</Badge>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {STATUS_LABELS[event.status] ?? event.status}
          </span>
        </div>
        <h2 className="mb-2 text-lg font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-700">
          {event.title}
        </h2>
        {event.summary && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {event.summary}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium">
            {event.sourceCount} 个来源
          </span>
          <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium">
            {event.articleCount} 篇文章
          </span>
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
      </EventListLink>
      {onUntrack && (
        <div className="absolute right-4 top-4">
          <EventUntrackButton
            eventId={event.id}
            variant="text"
            onSuccess={() => onUntrack(event.id)}
          />
        </div>
      )}
    </div>
  );
}
