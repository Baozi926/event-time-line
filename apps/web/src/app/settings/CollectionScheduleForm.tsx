'use client';

import { useState } from 'react';
import {
  COLLECTION_SCHEDULE_OPTIONS,
  formatHoursLabel,
  formatMinutesLabel,
  type CollectionScheduleSettings,
} from '@event-time-line/shared';
import { updateCollectionSchedule } from '@/lib/api';

const FIELD_LABELS = {
  fetchIntervalMinutes: 'GDELT 全量采集',
  rssDefaultIntervalMinutes: 'RSS 全局默认间隔',
  trackedIntervalMinutes: '关注事件采集',
  snapshotIntervalHours: '每日快照',
} as const;

const FIELD_HINTS = {
  fetchIntervalMinutes: '从 GDELT、USGS、Valyu 等拉取新文章并聚类（热榜有独立调度）',
  rssDefaultIntervalMinutes: '未单独配置的 RSS Feed 按此间隔采集；Worker 每 15 分钟检查一次到期',
  trackedIntervalMinutes: '为已关注事件补充最新报道',
  snapshotIntervalHours: '生成事件热度与文章数快照',
} as const;

export function CollectionScheduleForm({
  initial,
  updatedAt,
}: {
  initial: CollectionScheduleSettings;
  updatedAt?: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [settings, setSettings] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(updatedAt);

  const dirty =
    settings.fetchIntervalMinutes !== saved.fetchIntervalMinutes
    || settings.rssDefaultIntervalMinutes !== saved.rssDefaultIntervalMinutes
    || settings.trackedIntervalMinutes !== saved.trackedIntervalMinutes
    || settings.snapshotIntervalHours !== saved.snapshotIntervalHours
    || settings.runOnStartup !== saved.runOnStartup;

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await updateCollectionSchedule(settings);
      setSaved(result.settings);
      setSettings(result.settings);
      setLastSavedAt(result.updatedAt);
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setLoading(false);
    }
  }

  const savedLabel = lastSavedAt && lastSavedAt !== new Date(0).toISOString()
    ? `上次保存：${new Date(lastSavedAt).toLocaleString('zh-CN')}`
    : '尚未保存过自定义配置，当前为系统默认值';

  return (
    <section className="card">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">采集调度</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Worker 按以下频率自动执行；修改后约 30 秒内生效
        </p>
        <p className="mt-1 text-xs text-slate-400">{savedLabel}</p>
      </div>

      <div className="space-y-4 p-5">
        {(Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>).map((key) => (
          <label key={key} className="block">
            <span className="text-sm font-medium text-slate-700">
              {FIELD_LABELS[key]}
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">
              {FIELD_HINTS[key]}
            </span>
            <select
              value={settings[key]}
              onChange={(e) => setSettings((s) => ({
                ...s,
                [key]: Number(e.target.value),
              }))}
              disabled={loading}
              className="mt-2 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 sm:w-72"
            >
              {(key === 'snapshotIntervalHours'
                ? COLLECTION_SCHEDULE_OPTIONS.snapshotIntervalHours
                : COLLECTION_SCHEDULE_OPTIONS[key]
              ).map((value) => (
                <option key={value} value={value}>
                  {key === 'snapshotIntervalHours'
                    ? formatHoursLabel(value)
                    : formatMinutesLabel(value)}
                </option>
              ))}
            </select>
          </label>
        ))}

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
          <input
            type="checkbox"
            checked={settings.runOnStartup}
            onChange={(e) => setSettings((s) => ({
              ...s,
              runOnStartup: e.target.checked,
            }))}
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 disabled:opacity-50"
          />
          <span>
            <span className="text-sm font-medium text-slate-700">
              启动时立即采集
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">
              开启后，Worker 启动或调度变更时会立刻执行一轮；关闭则等到首个定时间隔后再跑
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !dirty}
            className="btn-primary px-5 disabled:opacity-50"
          >
            {loading ? '保存中…' : '保存设置'}
          </button>
          {dirty && !loading && (
            <span className="text-xs text-slate-400">有未保存的更改</span>
          )}
        </div>
      </div>

      {(message || error) && (
        <div className="border-t border-slate-100 px-5 py-3">
          {message && <p className="text-sm text-slate-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}
