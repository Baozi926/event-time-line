import type { TrackingAction, TrackingSource } from '@event-time-line/shared';

export const ACTION_LABELS: Record<TrackingAction, string> = {
  tracked: '加入关注',
  untracked: '取消关注',
};

export const ACTION_STYLES: Record<TrackingAction, string> = {
  tracked: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  untracked: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
};

export const SOURCE_LABELS: Record<TrackingSource, string> = {
  manual: '手动操作',
  auto_promote: '自动晋升',
  auto_archive: '自动归档',
};

export const TRACKING_STATUS_LABELS: Record<string, string> = {
  tracking: '关注中',
  archived: '已归档',
  candidate: '候选',
};

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
