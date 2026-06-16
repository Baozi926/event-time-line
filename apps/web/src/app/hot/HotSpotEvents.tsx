import Link from 'next/link';
import type { HotspotCandidate } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import { CandidateListLink } from '@/app/candidates/CandidateListLink';
import {
  categoryLabel,
  formatCandidateTime,
} from '@/app/candidates/candidateLabels';

function HeatBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-brand-700">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

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
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            系统发现的热点
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            由采集与聚类自动发现的高热度事件，可在候选池中加入关注
          </p>
        </div>
        <Link
          href="/candidates"
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          查看全部候选
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {candidates.map((candidate) => (
          <CandidateListLink
            key={candidate.id}
            candidateId={candidate.id}
            listPath={listPath}
            className="card-hover block scroll-mt-24 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <HeatBar score={candidate.heatScore} />
              {candidate.categoryHint && (
                <Badge variant="slate">
                  {categoryLabel(candidate.categoryHint)}
                </Badge>
              )}
            </div>
            <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-slate-900">
              {candidate.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span>{candidate.sourceCount} 个来源</span>
              <span>{candidate.articleCount} 篇文章</span>
              <span>{formatCandidateTime(candidate.lastSeenAt)}</span>
            </div>
          </CandidateListLink>
        ))}
      </div>
    </section>
  );
}
