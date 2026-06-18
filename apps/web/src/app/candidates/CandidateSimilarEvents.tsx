import Link from 'next/link';
import type { CandidateSimilarItem } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import { buildCandidateDetailPath } from './candidateNavigation';

function formatSimilarity(similarity: number): string {
  return `${Math.round(similarity * 100)}%`;
}

function itemHref(item: CandidateSimilarItem, returnTo: string): string {
  if (item.trackingStatus === 'candidate' && item.candidateId) {
    return buildCandidateDetailPath(item.candidateId, returnTo);
  }
  if (item.slug) return `/events/${item.slug}`;
  return '#';
}

export function CandidateSimilarEvents({
  items,
  returnTo,
}: {
  items: CandidateSimilarItem[];
  returnTo: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/40 px-4 py-3 text-xs leading-relaxed text-slate-600">
        暂无语义相近的其他热点。候选池里向量化事件增多后，这里会出现相似推荐。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">
        语义相近热点
        <span className="ml-1.5 font-normal text-slate-400">
          基于标题向量，不是关键词匹配
        </span>
      </p>
      <ul className="space-y-2">
        {items.map((item) => {
          const href = itemHref(item, returnTo);
          const disabled = href === '#';

          return (
            <li key={item.eventId}>
              <Link
                href={href}
                className={`block rounded-xl border border-emerald-100/80 bg-white/90 px-3 py-2.5 transition-colors ${
                  disabled
                    ? 'pointer-events-none opacity-60'
                    : 'hover:border-emerald-200 hover:bg-emerald-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">
                    {item.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-700">
                    {formatSimilarity(item.similarity)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.trackingStatus === 'tracking' ? 'brand' : 'slate'}>
                    {item.trackingStatus === 'tracking' ? '追踪中' : '候选'}
                  </Badge>
                  <span className="text-[11px] tabular-nums text-slate-400">
                    热度 {Math.round(item.heatScore)}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
