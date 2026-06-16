import type { Queue } from 'bullmq';
import { query } from '@event-time-line/database';
import {
  RSS_TICK_INTERVAL_MINUTES,
  COLLECTION_SCHEDULE_KEY,
  DEFAULT_COLLECTION_SCHEDULE,
  parseCollectionSchedule,
  type CollectionScheduleSettings,
  type DataSourcesSettings,
} from '@event-time-line/shared';
import { loadDataSourcesSettings } from './services/data-sources-settings.js';

type ScheduledJob = {
  name: string;
  everyMs: number;
};

function buildRepeatOptions(everyMs: number, runOnStartup: boolean) {
  if (runOnStartup) {
    return { every: everyMs };
  }

  return {
    every: everyMs,
    startDate: new Date(Date.now() + everyMs),
  };
}

function jobsMatchExisting(
  desired: ScheduledJob[],
  existing: Awaited<ReturnType<Queue['getRepeatableJobs']>>,
): boolean {
  if (existing.length !== desired.length) return false;

  return desired.every((job) =>
    existing.some(
      (entry) => entry.name === job.name && Number(entry.every) === job.everyMs,
    ),
  );
}

export async function loadCollectionSchedule(): Promise<{
  settings: CollectionScheduleSettings;
  updatedAt: string;
}> {
  const res = await query<{ value: unknown; updated_at: Date }>(
    `SELECT value, updated_at FROM app_settings WHERE key = $1`,
    [COLLECTION_SCHEDULE_KEY],
  );

  if (res.rows.length === 0) {
    return {
      settings: DEFAULT_COLLECTION_SCHEDULE,
      updatedAt: new Date(0).toISOString(),
    };
  }

  const row = res.rows[0];
  return {
    settings: parseCollectionSchedule(row.value) ?? DEFAULT_COLLECTION_SCHEDULE,
    updatedAt: row.updated_at.toISOString(),
  };
}

function buildDesiredJobs(
  settings: CollectionScheduleSettings,
  dataSources: DataSourcesSettings,
): ScheduledJob[] {
  const jobs: ScheduledJob[] = [
    { name: 'fetch', everyMs: settings.fetchIntervalMinutes * 60_000 },
    { name: 'fetch-rss', everyMs: RSS_TICK_INTERVAL_MINUTES * 60_000 },
    { name: 'tracked', everyMs: settings.trackedIntervalMinutes * 60_000 },
    { name: 'snapshot', everyMs: settings.snapshotIntervalHours * 3_600_000 },
  ];

  if (dataSources.hotTrend.enabled) {
    jobs.splice(2, 0, {
      name: 'fetch-hot-trend',
      everyMs: dataSources.hotTrend.fetchIntervalMinutes * 60_000,
    });
  }

  return jobs;
}

export async function applyCollectionSchedules(
  queue: Queue,
  settings: CollectionScheduleSettings,
  dataSources: DataSourcesSettings,
  options?: { force?: boolean },
): Promise<void> {
  const desired = buildDesiredJobs(settings, dataSources);

  const existing = await queue.getRepeatableJobs();
  if (!options?.force && jobsMatchExisting(desired, existing)) {
    console.log('[schedule] Repeatable jobs unchanged, skip re-register.');
    return;
  }

  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }

  for (const job of desired) {
    await queue.add(job.name, {}, {
      repeat: buildRepeatOptions(job.everyMs, settings.runOnStartup),
    });
  }

  const hotTrendLabel = dataSources.hotTrend.enabled
    ? `hot-trend=${dataSources.hotTrend.fetchIntervalMinutes}m`
    : 'hot-trend=off';

  console.log(
    `[schedule] fetch=${settings.fetchIntervalMinutes}m, `
    + `rss=${settings.rssDefaultIntervalMinutes}m (tick ${RSS_TICK_INTERVAL_MINUTES}m), `
    + `${hotTrendLabel}, `
    + `tracked=${settings.trackedIntervalMinutes}m, `
    + `snapshot=${settings.snapshotIntervalHours}h, `
    + `runOnStartup=${settings.runOnStartup}`,
  );
}

export function watchCollectionSchedule(
  queue: Queue,
  initialScheduleUpdatedAt: string,
  initialDataSourcesUpdatedAt: string,
): void {
  let lastScheduleUpdatedAt = initialScheduleUpdatedAt;
  let lastDataSourcesUpdatedAt = initialDataSourcesUpdatedAt;

  setInterval(async () => {
    try {
      const [schedule, dataSources] = await Promise.all([
        loadCollectionSchedule(),
        loadDataSourcesSettings(),
      ]);

      const scheduleChanged = schedule.updatedAt !== lastScheduleUpdatedAt;
      const dataSourcesChanged = dataSources.updatedAt !== lastDataSourcesUpdatedAt;

      if (scheduleChanged || dataSourcesChanged) {
        lastScheduleUpdatedAt = schedule.updatedAt;
        lastDataSourcesUpdatedAt = dataSources.updatedAt;
        await applyCollectionSchedules(
          queue,
          schedule.settings,
          dataSources.settings,
          { force: true },
        );
        console.log('[schedule] Settings changed, schedules refreshed.');
      }
    } catch (err) {
      console.error('[schedule] Failed to watch collection schedule:', err);
    }
  }, 30_000);
}
