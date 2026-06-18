import Link from 'next/link';
import { DEFAULT_COLLECTION_SCHEDULE } from '@event-time-line/shared';
import {
  getCollectionSchedule,
  getDataSourcesSettings,
  getRssFeeds,
} from '@/lib/api';
import { Alert } from '@/components/ui/Alert';
import { CollectionScheduleForm } from './CollectionScheduleForm';
import { RssFeedsManager } from './RssFeedsManager';
import { DataSourcesSettingsManager } from './DataSourcesSettingsManager';

export const dynamic = 'force-dynamic';

export default async function SettingsSourcesPage() {
  let rssFeeds: Awaited<ReturnType<typeof getRssFeeds>> | null = null;
  let schedule: Awaited<ReturnType<typeof getCollectionSchedule>> | null = null;
  let dataSources: Awaited<ReturnType<typeof getDataSourcesSettings>> | null = null;
  let error: string | null = null;

  try {
    [rssFeeds, schedule, dataSources] = await Promise.all([
      getRssFeeds(),
      getCollectionSchedule(),
      getDataSourcesSettings(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : '加载数据源配置失败';
  }

  const rssDefaultIntervalMinutes =
    schedule?.settings.rssDefaultIntervalMinutes
    ?? DEFAULT_COLLECTION_SCHEDULE.rssDefaultIntervalMinutes;

  return (
    <div className="space-y-6">
      {error && <Alert variant="warning">{error}</Alert>}

      {dataSources && (
        <DataSourcesSettingsManager
          initial={dataSources.settings}
          valyuApiKeyConfigured={dataSources.valyuApiKeyConfigured}
          deepSeekApiKeyConfigured={dataSources.deepSeekApiKeyConfigured}
          embeddingApiKeyConfigured={dataSources.embeddingApiKeyConfigured}
          embeddingServiceReachable={dataSources.embeddingServiceReachable}
        />
      )}

      <CollectionScheduleForm
        initial={schedule?.settings ?? DEFAULT_COLLECTION_SCHEDULE}
        updatedAt={schedule?.updatedAt}
      />

      <RssFeedsManager
        initialFeeds={rssFeeds?.feeds ?? []}
        rssDefaultIntervalMinutes={rssDefaultIntervalMinutes}
      />

      <p className="text-xs text-slate-400">
        RSS 全局默认间隔见上方「采集调度」；单条 Feed 可在订阅列表中单独覆盖。
        <Link href="/collection" className="ml-1 text-brand-600 hover:underline">
          前往采集记录手动触发
        </Link>
      </p>
    </div>
  );
}
