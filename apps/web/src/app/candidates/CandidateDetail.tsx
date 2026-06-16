import Link from 'next/link';

import type { HotspotCandidate } from '@event-time-line/shared';

import { Badge } from '@/components/ui/Badge';

import {
  CandidateActionBar,
  CandidateActionPanel,
} from './CandidateActionPanel';
import { CANDIDATE_DETAIL_STICKY_TOP } from './CandidateStickyBackNav';
import { CandidateArticleList } from './CandidateArticleList';
import {
  categoryLabel,
  countryLabel,
  formatCandidateDate,
  formatCandidateTime,
} from './candidateLabels';

function heatLevel(score: number): { label: string; barClass: string } {
  if (score >= 70)
    return { label: '高', barClass: 'from-orange-400 to-orange-600' };
  if (score >= 40)
    return { label: '中', barClass: 'from-amber-400 to-amber-600' };
  return { label: '低', barClass: 'from-slate-300 to-slate-400' };
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white px-4 py-2.5 sm:px-5">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}

export function CandidateDetail({
  candidate,
  returnTo = '/candidates',
}: {
  candidate: HotspotCandidate;
  returnTo?: string;
}) {
  const heat = heatLevel(candidate.heatScore);
  const hasSummary =
    candidate.summary && candidate.summary !== candidate.title;
  const regionCount = candidate.countryCodes?.length ?? 0;

  return (
    <>
      <div className="min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4 pb-20 lg:pb-0">
          <article className="card overflow-hidden">
            <div className="border-b border-orange-100/80 bg-gradient-to-br from-orange-50/70 via-white to-white px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="orange">候选热点</Badge>
                    {candidate.categoryHint && (
                      <Badge variant="slate">
                        {categoryLabel(candidate.categoryHint)}
                      </Badge>
                    )}
                    {candidate.countryCodes?.map((code) => (
                      <Badge key={code} variant="blue">
                        {countryLabel(code)}
                      </Badge>
                    ))}
                  </div>

                  <h1 className="break-words text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
                    {candidate.title}
                  </h1>

                  {hasSummary && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {candidate.summary}
                    </p>
                  )}
                </div>

                <div
                  className="flex shrink-0 items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/70 sm:min-w-[7.5rem]"
                  aria-label={`热度 ${candidate.heatScore.toFixed(0)}，${heat.label}`}
                >
                  <span className="text-2xl font-bold tabular-nums leading-none text-brand-700">
                    {candidate.heatScore.toFixed(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">
                      热度 · {heat.label}
                    </p>
                    <div className="mt-1.5 h-1.5 w-16 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${heat.barClass}`}
                        style={{
                          width: `${Math.min(Math.max(candidate.heatScore, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-4 sm:divide-y-0">
              <StatCell label="来源" value={candidate.sourceCount} />
              <StatCell label="文章" value={candidate.articleCount} />
              <StatCell
                label="地区"
                value={regionCount > 0 ? regionCount : '—'}
              />
              <StatCell
                label="首次发现"
                value={formatCandidateDate(candidate.firstSeenAt)}
              />
            </div>

            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 sm:px-5">
              最近更新 {formatCandidateTime(candidate.lastSeenAt)}
            </div>
          </article>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900">
                相关新闻
                {candidate.articleCount > 0 && (
                  <span className="ml-1.5 font-normal text-slate-400">
                    {candidate.articleCount} 篇
                  </span>
                )}
              </h2>
              {candidate.slug && (
                <Link
                  href={`/events/${candidate.slug}`}
                  className="shrink-0 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
                >
                  事件页 →
                </Link>
              )}
            </div>

            <div className="p-3 sm:p-4">
              {candidate.articles && candidate.articles.length > 0 ? (
                <CandidateArticleList
                  articles={candidate.articles}
                  fallbackCategory={candidate.categoryHint}
                  totalCount={candidate.articleCount}
                  variant="full"
                />
              ) : candidate.articleCount > 0 ? (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    共 {candidate.articleCount} 篇文章
                  </p>
                  <p className="mt-1 text-sm text-slate-400">暂无明细数据</p>
                </div>
              ) : (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    暂无相关新闻
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    系统尚未关联到此候选的报道
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside
          className="hidden lg:sticky lg:block lg:self-start"
          style={{ top: CANDIDATE_DETAIL_STICKY_TOP }}
        >
          <CandidateActionPanel
            candidateId={candidate.id}
            returnTo={returnTo}
            eventSlug={candidate.slug}
          />
        </aside>
      </div>

      <CandidateActionBar candidateId={candidate.id} returnTo={returnTo} />
    </>
  );
}
