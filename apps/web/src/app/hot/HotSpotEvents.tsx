import Link from 'next/link';
import type { HotspotCandidate } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import { HeatBar } from '@/components/ui/HeatBar';
import { CandidateActions } from '@/app/candidates/CandidateActions';
import { CandidateListLink } from '@/app/candidates/CandidateListLink';
import {
  categoryLabel,
  formatCandidateTime,
} from '@/app/candidates/candidateLabels';

export function HotSpotEvents({
  candidates,
  listPath,
}: {
  candidates: HotspotCandidate[];
  listPath: string;
}) {
  if (candidates.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            系统发现的热点
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            采集与聚类自动挖出来的高热度事件，看对眼就加入关注
          </p>
        </div>
        <Link
          href="/candidates"
          className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
        >
          查看全部候选
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="card-hover group relative scroll-mt-24 overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-[1.25rem] bg-gradient-to-r from-brand-500 via-blue-400 to-orange-400" />
            <div className="absolute right-4 top-4 z-10">
              <CandidateActions
                candidateId={candidate.id}
                eventId={candidate.eventId}
                subscribed={candidate.subscribed}
                subscribedDisplay="status"
                showAdminActions={false}
                layout="horizontal"
                compact
                className="justify-end"
              />
            </div>

            <CandidateListLink
              candidateId={candidate.id}
              listPath={listPath}
              className="block p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 pr-24">
                <HeatBar score={candidate.heatScore} compact showLabel={false} />
                {candidate.categoryHint && (
                  <Badge variant="brand">
                    {categoryLabel(candidate.categoryHint)}
                  </Badge>
                )}
              </div>
              <h3 className="mb-2 line-clamp-2 pr-24 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-700">
                {candidate.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium">
                  {candidate.sourceCount} 个来源
                </span>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium">
                  {candidate.articleCount} 篇文章
                </span>
                <span>{formatCandidateTime(candidate.lastSeenAt)}</span>
              </div>
            </CandidateListLink>
          </div>
        ))}
      </div>
    </section>
  );
}
