import type { KeywordMatchDetail, KeywordMatchField } from '@event-time-line/shared';
import { TOPIC_DEFINITIONS } from '@event-time-line/shared';

const FIELD_LABELS: Record<KeywordMatchField, string> = {
  title: '标题',
  summary: '摘要',
  category: '分类',
  topic: '主题标签',
};

function formatConfidence(confidence?: number): string | null {
  if (confidence == null || !Number.isFinite(confidence)) return null;
  return `${Math.round(confidence * 100)}%`;
}

function formatSimilarity(similarity?: number): string | null {
  if (similarity == null || !Number.isFinite(similarity)) return null;
  return `${Math.round(similarity * 100)}%`;
}

function formatMatchDetail(match: KeywordMatchDetail): string {
  const similarity = formatSimilarity(match.similarity);
  const confidence = formatConfidence(match.confidence);

  if (similarity && match.topicSlug && match.topicName) {
    const topicLabel = TOPIC_DEFINITIONS[match.topicSlug]?.name ?? match.topicName;
    if (match.reason) {
      return confidence
        ? `语义相似度 ${similarity}，分类为 ${topicLabel}，置信度 ${confidence}：${match.reason}`
        : `语义相似度 ${similarity}，分类为 ${topicLabel}：${match.reason}`;
    }
    return confidence
      ? `语义相似度 ${similarity}，分类为 ${topicLabel}，置信度 ${confidence}`
      : `语义相似度 ${similarity}，分类为 ${topicLabel}`;
  }

  if (similarity) return `语义相似度 ${similarity}`;

  if (match.topicSlug && match.topicName) {
    const topicLabel = TOPIC_DEFINITIONS[match.topicSlug]?.name ?? match.topicName;
    if (match.reason) {
      return confidence
        ? `分类为 ${topicLabel}，置信度 ${confidence}：${match.reason}`
        : `分类为 ${topicLabel}：${match.reason}`;
    }
    return confidence
      ? `分类为 ${topicLabel}，置信度 ${confidence}`
      : `分类为 ${topicLabel}`;
  }

  if (match.reason) return match.reason;
  if (match.fields?.length) {
    const labels = match.fields.map((field) => FIELD_LABELS[field]);
    return `匹配于 ${labels.join('、')}`;
  }

  return '已匹配你的关注';
}

export function KeywordMatchBanner({ matches }: { matches: KeywordMatchDetail[] }) {
  if (matches.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-orange-100/80 bg-orange-50/80 shadow-sm">
      <div className="h-1 bg-gradient-to-r from-orange-400 via-brand-400 to-blue-400" />
      <div className="px-5 py-4">
        <p className="text-sm font-bold text-orange-900">关键词推荐原因</p>
        <p className="mt-1 text-xs text-orange-700/80">
          系统优先用语义相似度召回相关事件，并结合主题分类解释推荐原因。
        </p>
        <ul className="mt-3 space-y-2">
          {matches.map((match) => (
            <li
              key={`${match.keyword}-${match.topicSlug ?? 'free'}`}
              className="rounded-2xl border border-orange-100 bg-white/80 px-3 py-2 text-sm text-orange-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                  {match.keyword}
                </span>
                <span className="text-orange-700">{formatMatchDetail(match)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function KeywordClassificationBadge({
  classifications,
}: {
  classifications: Array<{
    keyword: string;
    topicName?: string;
    confidence?: number;
    reason?: string;
    similarity?: number;
  }>;
}) {
  if (classifications.length === 0) return null;

  const primary = classifications[0];
  const confidence = formatConfidence(primary.confidence);
  const similarity = formatSimilarity(primary.similarity);

  return (
    <div className="inline-flex max-w-full flex-col items-end gap-1 rounded-2xl border border-orange-100 bg-orange-50/90 px-3 py-2 text-xs font-medium text-orange-700 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {similarity && <span>语义相似度 {similarity}</span>}
        {primary.topicName && (
          <>
            {similarity && <span className="text-orange-500">·</span>}
            <span>分类为</span>
            <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-orange-800 shadow-sm">
              {primary.topicName}
            </span>
          </>
        )}
        {confidence && <span className="text-orange-600">置信度 {confidence}</span>}
      </div>
      {primary.reason && (
        <p className="max-w-xs text-right text-[11px] leading-relaxed text-orange-600/90">
          {primary.reason}
        </p>
      )}
    </div>
  );
}
