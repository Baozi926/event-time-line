export interface CollectionScheduleSettings {
  /** GDELT / USGS / 热榜等全量采集间隔 */
  fetchIntervalMinutes: number;
  /** RSS 全局默认采集间隔（单条 Feed 可覆盖） */
  rssDefaultIntervalMinutes: number;
  trackedIntervalMinutes: number;
  snapshotIntervalHours: number;
  /** Worker 注册定时任务时是否立刻执行一轮（关闭则等到首个间隔后再跑） */
  runOnStartup: boolean;
}

export const COLLECTION_SCHEDULE_KEY = 'collection_schedule';

/** Worker 检查 RSS 到期的轮询间隔（固定，不对用户暴露） */
export const RSS_TICK_INTERVAL_MINUTES = 15;

export const DEFAULT_COLLECTION_SCHEDULE: CollectionScheduleSettings = {
  fetchIntervalMinutes: 120,
  rssDefaultIntervalMinutes: 60,
  trackedIntervalMinutes: 720,
  snapshotIntervalHours: 24,
  runOnStartup: false,
};

export const COLLECTION_SCHEDULE_OPTIONS = {
  fetchIntervalMinutes: [30, 60, 120, 720, 1440] as const,
  rssDefaultIntervalMinutes: [30, 60, 120, 240] as const,
  trackedIntervalMinutes: [360, 720, 1440] as const,
  snapshotIntervalHours: [6, 12, 24, 48] as const,
};

/** 单条 RSS Feed 可选的采集间隔；null 表示继承全局默认 */
export const RSS_FEED_INTERVAL_OPTIONS = [30, 60, 120, 240] as const;
export type RssFeedIntervalMinutes = (typeof RSS_FEED_INTERVAL_OPTIONS)[number];

export function resolveRssFeedInterval(
  feedInterval: number | null | undefined,
  defaultInterval: number,
): number {
  return feedInterval ?? defaultInterval;
}

export function formatMinutesLabel(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) return `每 ${minutes / 1440} 天`;
  if (minutes < 60) return `每 ${minutes} 分钟`;
  if (minutes % 60 === 0) return `每 ${minutes / 60} 小时`;
  return `每 ${minutes} 分钟`;
}

export function formatHoursLabel(hours: number): string {
  if (hours < 24) return `每 ${hours} 小时`;
  if (hours % 24 === 0) return `每 ${hours / 24} 天`;
  return `每 ${hours} 小时`;
}

function isAllowed<T extends readonly number[]>(
  value: number,
  allowed: T,
): value is T[number] {
  return (allowed as readonly number[]).includes(value);
}

export function parseCollectionSchedule(
  input: unknown,
): CollectionScheduleSettings | null {
  if (!input || typeof input !== 'object') return null;

  const raw = input as Record<string, unknown>;
  const fetchIntervalMinutes = Number(raw.fetchIntervalMinutes);
  const rssDefaultIntervalMinutes = raw.rssDefaultIntervalMinutes !== undefined
    ? Number(raw.rssDefaultIntervalMinutes)
    : DEFAULT_COLLECTION_SCHEDULE.rssDefaultIntervalMinutes;
  const trackedIntervalMinutes = Number(raw.trackedIntervalMinutes);
  const snapshotIntervalHours = Number(raw.snapshotIntervalHours);

  if (
    !isAllowed(fetchIntervalMinutes, COLLECTION_SCHEDULE_OPTIONS.fetchIntervalMinutes)
    || !isAllowed(rssDefaultIntervalMinutes, COLLECTION_SCHEDULE_OPTIONS.rssDefaultIntervalMinutes)
    || !isAllowed(trackedIntervalMinutes, COLLECTION_SCHEDULE_OPTIONS.trackedIntervalMinutes)
    || !isAllowed(snapshotIntervalHours, COLLECTION_SCHEDULE_OPTIONS.snapshotIntervalHours)
  ) {
    return null;
  }

  return {
    fetchIntervalMinutes,
    rssDefaultIntervalMinutes,
    trackedIntervalMinutes,
    snapshotIntervalHours,
    runOnStartup: raw.runOnStartup === true,
  };
}
