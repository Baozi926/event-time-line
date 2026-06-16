import type { Event } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import { EventUntrackButton } from '@/components/EventUntrackButton';
import { EventListLink } from '@/components/following/EventListLink';

const STATUS_LABELS: Record<string, string> = {
  developing: '发展中',
  settled: '已平息',
  long_term: '长期影响',
  disputed: '存疑',
};

function HeatBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-brand-700">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

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
    <div className="card-hover group relative scroll-mt-24 p-5">
      <EventListLink
        eventId={event.id}
        slug={event.slug}
        listPath={listPath}
        className="block"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 pr-16">
          <HeatBar score={event.heatScore} />
          {event.categoryHint && (
            <Badge variant="slate">{event.categoryHint}</Badge>
          )}
          <span className="text-xs text-slate-400">
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
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
      </EventListLink>
      {onUntrack && (
        <div className="absolute right-4 top-4">
          <EventUntrackButton
            slug={event.slug}
            variant="text"
            onSuccess={() => onUntrack(event.id)}
          />
        </div>
      )}
    </div>
  );
}
