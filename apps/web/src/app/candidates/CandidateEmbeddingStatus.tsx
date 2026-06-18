'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CandidateEmbeddingInfo } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import { generateCandidateEmbedding, generateEventEmbedding } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function CandidateEmbeddingStatus({
  candidateId,
  eventSlug,
  embedding,
  hasSimilarEvents,
}: {
  candidateId?: string;
  eventSlug?: string;
  embedding: CandidateEmbeddingInfo;
  hasSimilarEvents?: boolean;
}) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);

  const providerLabel =
    embedding.provider === 'local'
      ? '本地模型'
      : embedding.provider === 'api'
        ? '远程 API'
        : null;

  const canGenerate =
    isAdmin && embedding.enabled && !embedding.hasEmbedding && !loading;

  async function handleGenerate() {
    setFeedback(null);
    setLoading(true);
    try {
      if (eventSlug) {
        await generateEventEmbedding(eventSlug);
      } else if (candidateId) {
        await generateCandidateEmbedding(candidateId);
      } else {
        throw new Error('无法生成向量');
      }
      setJustGenerated(true);
      router.refresh();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">语义向量</span>
        {!embedding.enabled ? (
          <Badge variant="slate">未启用</Badge>
        ) : embedding.hasEmbedding ? (
          <Badge variant="green">已生成</Badge>
        ) : (
          <Badge variant="slate">待生成</Badge>
        )}
        {embedding.enabled && providerLabel && (
          <span className="text-slate-400">{providerLabel}</span>
        )}
        {embedding.model && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
            {embedding.model}
          </span>
        )}
        {embedding.dimensions != null && (
          <span className="text-slate-400">{embedding.dimensions} 维</span>
        )}
        {canGenerate && (
          <button
            type="button"
            onClick={handleGenerate}
            className="ml-auto rounded-full border border-brand-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            手动生成
          </button>
        )}
        {loading && (
          <span className="ml-auto text-[11px] text-brand-600">生成中…</span>
        )}
      </div>

      {embedding.hasEmbedding && (
        <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/50 px-3 py-2 text-[11px] leading-relaxed text-emerald-800">
          {justGenerated ? (
            <p className="font-semibold">向量已生成。下方会展示语义相近的其他热点。</p>
          ) : (
            <p>
              标题已编码为 {embedding.dimensions ?? 1024} 维向量，用于关键词语义召回
              {hasSimilarEvents ? '，并在下方列出相近热点' : ''}。
            </p>
          )}
          <p className="mt-1 text-emerald-700/80">
            主题倾向（上方）来自 AI 分类；语义向量用于「意思相近」的匹配，两者相互独立。
          </p>
        </div>
      )}

      {!embedding.hasEmbedding && embedding.enabled && (
        <p className="text-[11px] leading-relaxed text-slate-500">
          生成后可发现语义相近的其他热点，并参与「我的关注」里的关键词语义召回。
        </p>
      )}

      {feedback && (
        <p className="text-[11px] text-red-600">{feedback}</p>
      )}
    </div>
  );
}
