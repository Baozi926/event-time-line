import type {
  CandidateEmbeddingInfo,
  CandidateSimilarItem,
  CandidateTopicClassification,
} from '@event-time-line/shared';
import { TOPIC_DEFINITIONS } from '@event-time-line/shared';
import { CandidateEmbeddingStatus } from './CandidateEmbeddingStatus';
import { CandidateSimilarEvents } from './CandidateSimilarEvents';

const TOPIC_ICONS: Record<string, string> = {
  ai: '🤖',
  politics: '🏛️',
  disaster: '🌊',
  conflict: '⚔️',
  economy: '📈',
  tech: '💻',
  health: '🏥',
  society: '👥',
  environment: '🌿',
  sports: '⚽',
  culture: '🎬',
};

const TOPIC_BAR_COLORS: Record<string, string> = {
  ai: 'from-violet-500 to-purple-400',
  politics: 'from-slate-600 to-slate-400',
  disaster: 'from-amber-500 to-orange-400',
  conflict: 'from-red-600 to-rose-400',
  economy: 'from-emerald-600 to-teal-400',
  tech: 'from-blue-600 to-cyan-400',
  health: 'from-pink-500 to-rose-400',
  society: 'from-indigo-500 to-blue-400',
  environment: 'from-green-600 to-lime-400',
  sports: 'from-orange-500 to-yellow-400',
  culture: 'from-fuchsia-500 to-pink-400',
};

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function classificationMethodLabel(reason?: string): string {
  if (!reason) return '主题分类';
  if (reason === '规则关键词匹配') return '关键词规则';
  if (reason === '来自采集分类标签') return '采集标签';
  if (reason.includes('语义相似度')) return '语义分类';
  return 'AI 分类';
}

function TopicBar({ topic }: { topic: CandidateTopicClassification }) {
  const pct = Math.round(topic.confidence * 100);
  const barColor =
    TOPIC_BAR_COLORS[topic.slug] ?? 'from-brand-500 to-blue-400';
  const icon = TOPIC_ICONS[topic.slug] ?? '🏷️';
  const def = TOPIC_DEFINITIONS[topic.slug];

  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-700">
          <span aria-hidden>{icon}</span>
          <span className="truncate">{topic.name}</span>
          {def?.nameEn && (
            <span className="hidden truncate text-slate-400 sm:inline">
              {def.nameEn}
            </span>
          )}
        </span>
        <span className="shrink-0 tabular-nums font-semibold text-slate-600">
          {formatConfidence(topic.confidence)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-blue-50 ring-1 ring-blue-100/80">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
      {topic.reason && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
          {topic.reason}
        </p>
      )}
    </div>
  );
}

export function CandidateTopicProfile({
  candidateId,
  eventSlug,
  topics,
  embedding,
  similarEvents,
  categoryHint,
  returnTo = '/candidates',
}: {
  candidateId?: string;
  eventSlug?: string;
  topics?: CandidateTopicClassification[];
  embedding?: CandidateEmbeddingInfo;
  similarEvents?: CandidateSimilarItem[];
  categoryHint?: string;
  returnTo?: string;
}) {
  const sortedTopics = [...(topics ?? [])].sort(
    (a, b) => b.confidence - a.confidence,
  );
  const primary = sortedTopics[0];
  const hasTopics = sortedTopics.length > 0;

  return (
    <section className="card overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-brand-500 via-violet-400 to-orange-400" />
      <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50/40 to-violet-50/30 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-900">主题倾向</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          根据标题与摘要，判断这条热点更偏哪类主题
        </p>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {hasTopics && primary ? (
          <>
            <div className="rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/80 via-white to-blue-50/50 px-4 py-3">
              <p className="text-xs font-medium text-violet-600">主要偏向</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
                <span aria-hidden>{TOPIC_ICONS[primary.slug] ?? '🏷️'}</span>
                <span>{primary.name}</span>
                <span className="text-base font-semibold tabular-nums text-violet-600">
                  {formatConfidence(primary.confidence)}
                </span>
              </p>
              {primary.reason && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {primary.reason}
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                分类方式：{classificationMethodLabel(primary.reason)}
              </p>
            </div>

            {sortedTopics.length > 1 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500">各主题匹配度</p>
                {sortedTopics.map((topic) => (
                  <TopicBar key={topic.slug} topic={topic} />
                ))}
              </div>
            )}
          </>
        ) : categoryHint && TOPIC_DEFINITIONS[categoryHint] ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
            <p>
              尚未完成详细主题分析，当前采集标签为{' '}
              <span className="font-semibold text-slate-800">
                {TOPIC_DEFINITIONS[categoryHint].name}
              </span>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
            未能归类到已知主题。若已启用语义向量，请刷新重试；也可在系统设置开启 AI 增强获得更细分类。
          </div>
        )}
      </div>

      {embedding?.hasEmbedding && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5">
          <CandidateEmbeddingStatus
            candidateId={candidateId}
            eventSlug={eventSlug}
            embedding={embedding}
            hasSimilarEvents={(similarEvents?.length ?? 0) > 0}
          />
        </div>
      )}

      {embedding?.hasEmbedding && (
        <div className="border-t border-emerald-100/80 bg-gradient-to-b from-emerald-50/30 to-white px-4 py-4 sm:px-5">
          <CandidateSimilarEvents items={similarEvents ?? []} returnTo={returnTo} />
        </div>
      )}

      {embedding && !embedding.hasEmbedding && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5">
          <CandidateEmbeddingStatus
            candidateId={candidateId}
            eventSlug={eventSlug}
            embedding={embedding}
          />
        </div>
      )}
    </section>
  );
}
