'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getDashboardStats } from '@/lib/api';
import type {
  CollectionRun,
  DashboardStats,
} from '@event-time-line/shared';

const REFRESH_MS = 30_000;

const RUN_TYPE_LABELS: Record<string, string> = {
  fetch_all: '全量采集',
  fetch_gdelt: 'GDELT',
  fetch_rss: 'RSS',
  fetch_valyu: 'Valyu',
  fetch_usgs: 'USGS',
  fetch_tracked: '关注事件',
  tracked: '关注事件',
  snapshot: '快照',
};

const STATUS_LABELS: Record<string, string> = {
  running: '运行中',
  completed: '完成',
  failed: '失败',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtNum(n: number) {
  return n.toLocaleString('zh-CN');
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'blue' | 'amber' | 'red';
}) {
  const accentClass = accent
    ? {
        green: 'text-emerald-600',
        blue: 'text-blue-600',
        amber: 'text-amber-600',
        red: 'text-red-600',
      }[accent]
    : 'text-slate-900';

  return (
    <div className="card px-3 py-2">
      <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`text-xl font-bold tabular-nums leading-tight ${accentClass}`}>
        {value}
      </p>
      {sub && (
        <p className="truncate text-[10px] text-slate-400">{sub}</p>
      )}
    </div>
  );
}

function Panel({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex min-h-0 flex-col overflow-hidden p-3">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h2 className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
        {extra}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function DailyChart({ data }: { data: DashboardStats['articlesDaily'] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex h-full min-h-0 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
          <span className="text-[9px] tabular-nums text-slate-400">
            {d.count > 0 ? d.count : ''}
          </span>
          <div
            className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-500"
            style={{
              height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
            }}
            title={`${d.date}: ${d.count} 篇`}
          />
          <span className="text-[9px] text-slate-400">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function LlmDailyChart({ data }: { data: DashboardStats['llmUsage']['daily'] }) {
  const max = Math.max(...data.map((d) => d.callCount), 1);

  return (
    <div className="flex h-full min-h-0 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
          <span className="text-[9px] tabular-nums text-violet-500">
            {d.callCount > 0 ? d.callCount : ''}
          </span>
          <div
            className="w-full rounded-t bg-gradient-to-t from-violet-600 to-violet-400"
            style={{
              height: `${Math.max((d.callCount / max) * 100, d.callCount > 0 ? 8 : 2)}%`,
            }}
            title={`${d.date}: ${d.callCount} 次${d.errorCount > 0 ? `，失败 ${d.errorCount}` : ''}`}
          />
          <span className="text-[9px] text-slate-400">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function RunRow({ run }: { run: CollectionRun }) {
  const statusColor =
    run.status === 'running'
      ? 'text-blue-600'
      : run.status === 'failed'
        ? 'text-red-600'
        : 'text-emerald-600';

  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-slate-100 py-1 text-xs last:border-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">
          {RUN_TYPE_LABELS[run.runType] ?? run.runType}
          {run.category && (
            <span className="ml-1 text-slate-500">· {run.category}</span>
          )}
        </p>
        <p className="text-[10px] text-slate-400">{fmtTime(run.startedAt)}</p>
      </div>
      <span className={`text-[10px] font-medium ${statusColor}`}>
        {STATUS_LABELS[run.status] ?? run.status}
      </span>
      <span className="text-right text-[10px] tabular-nums text-slate-500">
        +{run.articlesNew}/{run.articlesFound}
      </span>
    </div>
  );
}

export function DashboardPanel({
  initial,
  error: initialError,
}: {
  initial: DashboardStats | null;
  error: string | null;
}) {
  const [stats, setStats] = useState(initial);
  const [error, setError] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => refresh(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  if (error && !stats) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const recentRuns = stats.collection.recentRuns.slice(0, 6);
  const categoryActivity = stats.collection.categoryActivity.slice(0, 5);
  const topEvents = stats.topEvents.slice(0, 5);
  const topCandidates = stats.topCandidates.slice(0, 5);

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1.1fr)_minmax(0,1.3fr)_auto] gap-2 overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="shrink-0 text-lg font-bold tracking-tight text-slate-900">
            监控大屏
          </h1>
          {stats.collection.isRunning && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              采集中
            </span>
          )}
          <span className="hidden truncate text-[11px] text-slate-500 sm:inline">
            每 30 秒自动刷新
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-500">
          <span className="hidden tabular-nums md:inline">
            {fmtTime(stats.generatedAt)}
          </span>
          <button
            onClick={() => refresh()}
            disabled={refreshing}
            className="btn-secondary px-2 py-1"
          >
            {refreshing ? '…' : '刷新'}
          </button>
          <Link href="/collection" className="btn-primary px-2 py-1">
            采集记录
          </Link>
        </div>
      </div>

      {/* Core metrics */}
      <div className="grid shrink-0 grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-7">
        <Metric
          label="文章总数"
          value={fmtNum(stats.data.articles.total)}
          sub={`24h +${fmtNum(stats.data.articles.last24h)} · 1h +${fmtNum(stats.data.articles.last1h)}`}
        />
        <Metric
          label="媒体来源"
          value={fmtNum(stats.data.sources.total)}
          accent="green"
        />
        <Metric
          label="关注事件"
          value={fmtNum(stats.data.events.tracking)}
          sub={`候选 ${stats.data.events.candidate} · 归档 ${stats.data.events.archived}`}
        />
        <Metric
          label="候选热点"
          value={fmtNum(stats.data.candidates.open)}
          accent="amber"
        />
        <Metric
          label="24h 新增文章"
          value={fmtNum(stats.collection.last24h.articlesNew)}
          sub={`发现 ${fmtNum(stats.collection.last24h.articlesFound)} 篇`}
          accent="green"
        />
        <Metric
          label="24h 采集任务"
          value={fmtNum(stats.collection.last24h.runs)}
          sub={`成功 ${stats.collection.last24h.completed} · 失败 ${stats.collection.last24h.failed}`}
          accent={stats.collection.last24h.failed > 0 ? 'red' : 'blue'}
        />
        <Metric
          label="今日大模型调用"
          value={fmtNum(stats.llmUsage.todayCalls)}
          sub={
            stats.llmUsage.todayErrors > 0
              ? `DeepSeek · 失败 ${stats.llmUsage.todayErrors}`
              : `DeepSeek · 近 7 日 ${fmtNum(stats.llmUsage.last7dCalls)} 次`
          }
          accent="blue"
        />
      </div>

      {/* Middle row */}
      <div className="grid min-h-0 grid-cols-2 gap-2 xl:grid-cols-4">
        <Panel title="近 7 日入库趋势">
          {stats.articlesDaily.length > 0 ? (
            <DailyChart data={stats.articlesDaily} />
          ) : (
            <p className="text-center text-xs text-slate-400">暂无数据</p>
          )}
        </Panel>

        <Panel title="24h 分类采集">
          {categoryActivity.length > 0 ? (
            <div className="space-y-1">
              {categoryActivity.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1"
                >
                  <span className="truncate text-xs font-medium text-slate-900">
                    {c.category}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
                    +{c.articlesNew}/{c.articlesFound} · {c.runs}次
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-400">暂无分类采集</p>
          )}
        </Panel>

        <Panel
          title="近 7 日大模型调用"
          extra={
            <span className="shrink-0 text-[10px] text-slate-400">
              DeepSeek 主题分类
            </span>
          }
        >
          {stats.llmUsage.daily.length > 0 ? (
            <LlmDailyChart data={stats.llmUsage.daily} />
          ) : (
            <p className="text-center text-xs text-slate-400">
              暂无调用记录（开启 AI 增强后 Worker 分类时会累计）
            </p>
          )}
        </Panel>

        <Panel
          title="最近采集任务"
          extra={
            <span className="shrink-0 text-[10px] text-slate-400">
              累计 {fmtNum(stats.collection.totalRuns)} 次
            </span>
          }
        >
          {recentRuns.length > 0 ? (
            <div>
              {recentRuns.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-400">暂无任务</p>
          )}
        </Panel>
      </div>

      {/* Bottom row */}
      <div className="grid min-h-0 grid-cols-2 gap-2">
        <Panel
          title="热度 TOP · 关注中"
          extra={
            <Link
              href="/"
              className="shrink-0 text-[10px] font-medium text-brand-600 hover:text-brand-700"
            >
              全部 →
            </Link>
          }
        >
          {topEvents.length > 0 ? (
            <div className="space-y-1">
              {topEvents.map((e, i) => (
                <Link
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 transition-colors hover:bg-slate-100"
                >
                  <span className="w-4 shrink-0 text-[11px] font-bold tabular-nums text-slate-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-900">
                      {e.title}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {e.articleCount} 篇 · {e.sourceCount} 来源
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-brand-700">
                    {e.heatScore.toFixed(0)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-400">暂无关注事件</p>
          )}
        </Panel>

        <Panel
          title="热度 TOP · 候选池"
          extra={
            <Link
              href="/candidates"
              className="shrink-0 text-[10px] font-medium text-brand-600 hover:text-brand-700"
            >
              全部 →
            </Link>
          }
        >
          {topCandidates.length > 0 ? (
            <div className="space-y-1">
              {topCandidates.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1"
                >
                  <span className="w-4 shrink-0 text-[11px] font-bold tabular-nums text-slate-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-900">
                      {c.title}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {c.articleCount} 篇 · {c.sourceCount} 来源
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-amber-600">
                    {c.heatScore.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-400">暂无候选热点</p>
          )}
        </Panel>
      </div>

      {/* Footer summary */}
      <div className="card shrink-0 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5 text-[11px] text-slate-500">
          <span>
            24h 新建事件{' '}
            <strong className="text-slate-900">
              {stats.collection.last24h.eventsCreated}
            </strong>
          </span>
          <span>
            24h 晋升关注{' '}
            <strong className="text-emerald-600">
              {stats.collection.last24h.eventsPromoted}
            </strong>
          </span>
          <span>
            事件总量{' '}
            <strong className="text-slate-900">{stats.data.events.total}</strong>
          </span>
          <span>
            采集状态{' '}
            <strong
              className={
                stats.collection.isRunning ? 'text-blue-600' : 'text-slate-700'
              }
            >
              {stats.collection.isRunning ? '运行中' : '空闲'}
            </strong>
          </span>
          {stats.collection.activeRun && (
            <span className="truncate text-blue-600">
              进行中：{RUN_TYPE_LABELS[stats.collection.activeRun.runType] ?? stats.collection.activeRun.runType}
              {stats.collection.activeRun.category
                ? ` · ${stats.collection.activeRun.category}`
                : ''}
              {' · '}
              {fmtTime(stats.collection.activeRun.startedAt)}
            </span>
          )}
          <span>
            今日大模型{' '}
            <strong className="text-violet-600">
              {stats.llmUsage.todayCalls}
            </strong>
            {' 次'}
            {stats.llmUsage.todayErrors > 0 && (
              <>
                {' · 失败 '}
                <strong className="text-red-600">{stats.llmUsage.todayErrors}</strong>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
