import type { EventDailySnapshot, EventEnriched } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import { CandidateArticleList } from '@/app/candidates/CandidateArticleList';
import { CandidateTopicProfile } from '@/app/candidates/CandidateTopicProfile';
import {
  categoryLabel,
  countryLabel,
  formatCandidateDate,
  formatCandidateTime,
} from '@/app/candidates/candidateLabels';
import { EVENT_DETAIL_STICKY_TOP } from '@/components/events/EventStickyBackNav';
import {
  EventActionBar,
  EventActionPanel,
} from '@/components/events/EventActionPanel';
import { KeywordMatchBanner } from '@/components/following/KeywordMatchBanner';
import type { KeywordEventMatchResponse } from '@event-time-line/shared';
import { clampHeatScore, heatVisual } from '@/lib/heatVisual';

const STATUS_LABELS: Record<string, string> = {
  developing: '发展中',
  settled: '已平息',
  long_term: '长期影响',
  disputed: '存疑',
  candidate: '候选',
  tracking: '关注中',
  archived: '已归档',
};

const TRACKING_BADGE: Record<string, { label: string; variant: 'brand' | 'orange' | 'slate' }> = {
  tracking: { label: '关注中', variant: 'brand' },
  candidate: { label: '候选热点', variant: 'orange' },
  archived: { label: '已归档', variant: 'slate' },
};

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

function EventSnapshotsSection({
  snapshots,
}: {
  snapshots: EventDailySnapshot[];
}) {
  if (snapshots.length === 0) return null;

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/30 to-white px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-900">每日快照</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          追踪期间的热度变化与摘要回顾
        </p>
      </div>
      <div className="space-y-3 p-3 sm:p-4">
        {snapshots.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-2.5 sm:px-3.5 sm:py-3"
          >
            <div className="mb-1 flex items-center justify-between gap-4">
              <span className="font-medium text-slate-800">{s.snapshotDate}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                热度 {s.heatScore.toFixed(0)} · 新增 {s.newArticles24h} 篇
              </span>
            </div>
            {s.summary && (
              <p className="text-sm leading-relaxed text-slate-600">{s.summary}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function EventDetailView({
  event,
  snapshots = [],
  keywordMatches = [],
  returnTo,
  showAdminUntrack = false,
}: {
  event: EventEnriched;
  snapshots?: EventDailySnapshot[];
  keywordMatches?: KeywordEventMatchResponse['matches'];
  returnTo: string;
  showAdminUntrack?: boolean;
}) {
  const heat = heatVisual(event.heatScore);
  const hasSummary = event.summary && event.summary !== event.title;
  const regionCount = event.countryCodes?.length ?? 0;
  const trackingBadge =
    TRACKING_BADGE[event.trackingStatus] ?? TRACKING_BADGE.tracking;

  return (
    <>
      {keywordMatches.length > 0 && (
        <div className="mb-4">
          <KeywordMatchBanner matches={keywordMatches} />
        </div>
      )}

      <div className="min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4 pb-20 lg:pb-0">
          <article className="card overflow-hidden">
            <div className="border-b border-blue-100/80 bg-gradient-to-br from-blue-50/70 via-white to-orange-50/40 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant={trackingBadge.variant}>
                      {trackingBadge.label}
                    </Badge>
                    <Badge variant="green">
                      {STATUS_LABELS[event.status] ?? event.status}
                    </Badge>
                    {event.categoryHint && (
                      <Badge variant="slate">
                        {categoryLabel(event.categoryHint)}
                      </Badge>
                    )}
                    {event.countryCodes?.map((code) => (
                      <Badge key={code} variant="blue">
                        {countryLabel(code)}
                      </Badge>
                    ))}
                  </div>

                  <h1 className="break-words text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
                    {event.title}
                  </h1>

                  {hasSummary && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {event.summary}
                    </p>
                  )}
                </div>

                <div
                  className="flex shrink-0 items-center gap-3 rounded-2xl border border-blue-100 bg-white/90 px-3 py-2.5 shadow-sm sm:min-w-[7.5rem]"
                  aria-label={`热度 ${event.heatScore.toFixed(0)}，${heat.label}`}
                >
                  <span
                    className={`text-2xl font-bold tabular-nums leading-none ${heat.scoreClass}`}
                  >
                    {event.heatScore.toFixed(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">
                      热度 · {heat.label}
                    </p>
                    <div
                      className={`mt-1.5 h-1.5 w-16 overflow-hidden rounded-full ring-1 ${heat.trackClass}`}
                    >
                      <div
                        className={`h-full rounded-full ${heat.fillClass}`}
                        style={{
                          width: `${clampHeatScore(event.heatScore)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-blue-50 border-t border-blue-50 bg-gradient-to-r from-blue-50/20 to-orange-50/10 sm:grid-cols-4 sm:divide-y-0">
              <StatCell label="来源" value={event.sourceCount} />
              <StatCell label="文章" value={event.articleCount} />
              <StatCell
                label="地区"
                value={regionCount > 0 ? regionCount : '—'}
              />
              <StatCell
                label="首次发现"
                value={formatCandidateDate(event.firstSeenAt)}
              />
            </div>

            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 sm:px-5">
              最近更新 {formatCandidateTime(event.lastUpdatedAt)}
              {event.lastCollectedAt && (
                <span className="ml-3">
                  · 最近采集 {formatCandidateTime(event.lastCollectedAt)}
                </span>
              )}
            </div>
          </article>

          <CandidateTopicProfile
            eventSlug={event.slug}
            topics={event.topicClassifications}
            embedding={event.embedding}
            similarEvents={event.similarEvents}
            categoryHint={event.categoryHint}
            returnTo={returnTo}
          />

          <EventSnapshotsSection snapshots={snapshots} />

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-blue-50 bg-gradient-to-r from-blue-50/30 to-white px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900">
                相关新闻
                {event.articleCount > 0 && (
                  <span className="ml-1.5 font-normal text-slate-400">
                    {event.articleCount} 篇
                  </span>
                )}
              </h2>
            </div>

            <div className="p-3 sm:p-4">
              {event.detailArticles && event.detailArticles.length > 0 ? (
                <CandidateArticleList
                  articles={event.detailArticles}
                  fallbackCategory={event.categoryHint}
                  totalCount={event.articleCount}
                  variant="full"
                />
              ) : event.articleCount > 0 ? (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    共 {event.articleCount} 篇文章
                  </p>
                  <p className="mt-1 text-sm text-slate-400">暂无明细数据</p>
                </div>
              ) : (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    暂无相关新闻
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    系统尚未关联到此事件的报道
                  </p>
                </div>
              )}
            </div>
          </section>

          <p className="text-xs leading-relaxed text-slate-400">
            信息来源于公开报道，可能随事态发展变化。点击来源链接查看原文。
          </p>
        </div>

        <aside
          className="hidden lg:sticky lg:block lg:self-start"
          style={{ top: EVENT_DETAIL_STICKY_TOP }}
        >
          <EventActionPanel
            eventId={event.id}
            slug={event.slug}
            subscribed={event.subscribed}
            showAdminUntrack={showAdminUntrack}
          />
        </aside>
      </div>

      <EventActionBar
        eventId={event.id}
        slug={event.slug}
        subscribed={event.subscribed}
        showAdminUntrack={showAdminUntrack}
      />
    </>
  );
}
