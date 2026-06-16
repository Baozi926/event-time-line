'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { triggerCollection, type CollectionJob } from '@/lib/api';

const JOB_OPTIONS: { value: CollectionJob; label: string }[] = [
  { value: 'fetch', label: 'GDELT 全量采集' },
  { value: 'fetch-hot-trend', label: '多平台热榜' },
  { value: 'fetch-rss', label: 'RSS 采集（强制全量）' },
  { value: 'tracked', label: '关注事件采集' },
  { value: 'snapshot', label: '每日快照' },
  { value: 'all', label: '全部任务' },
];

export function CollectionTrigger({
  isRunning,
  compact = false,
}: {
  isRunning: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [job, setJob] = useState<CollectionJob>('fetch');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleTrigger() {
    setLoading(true);
    setMessage(null);
    try {
      const result = await triggerCollection(job);
      setMessage(result.message);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '触发失败');
    } finally {
      setLoading(false);
    }
  }

  const controls = (
    <>
      <select
        value={job}
        onChange={(e) => setJob(e.target.value as CollectionJob)}
        disabled={loading || isRunning}
        className={`rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        }`}
      >
        {JOB_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleTrigger}
        disabled={loading || isRunning}
        className={compact ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-primary px-5'}
      >
        {loading ? '启动中…' : isRunning ? '任务运行中' : '立即采集'}
      </button>
    </>
  );

  const statusNote =
    isRunning || message ? (
      <p className="text-xs text-amber-700">
        {isRunning && '当前有采集任务正在运行，完成后可再次触发。'}
        {isRunning && message && ' '}
        {message && <span className="text-slate-600">{message}</span>}
      </p>
    ) : null;

  if (compact) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {controls}
        </div>
        {statusNote}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">手动触发采集</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            选择任务类型后立即执行，结果将出现在下方记录中
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">{controls}</div>
      </div>
      {statusNote && (
        <div className="border-t border-slate-100 px-5 py-2.5">{statusNote}</div>
      )}
    </div>
  );
}
