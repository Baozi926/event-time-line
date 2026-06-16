import { getCollectionRun } from '@/lib/api';
import { BackLink } from '@/components/ui/BackLink';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { CollectionRunDetail } from '../CollectionRunDetail';
import {
  RUN_TYPE_LABELS,
  formatDuration,
  formatTime,
} from '../collectionLabels';

export const dynamic = 'force-dynamic';

export default async function CollectionRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let run: Awaited<ReturnType<typeof getCollectionRun>>['run'] | null = null;
  let error: string | null = null;

  try {
    ({ run } = await getCollectionRun(id));
  } catch (e) {
    error = e instanceof Error ? e.message : '加载失败';
  }

  if (error || !run) {
    return (
      <div>
        <BackLink href="/collection">返回采集记录</BackLink>
        <Alert variant="error">{error ?? '采集记录不存在'}</Alert>
      </div>
    );
  }

  const title = RUN_TYPE_LABELS[run.runType] ?? run.runType;
  const description = [
    formatTime(run.startedAt),
    run.finishedAt &&
      `耗时 ${formatDuration(run.startedAt, run.finishedAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <BackLink href="/collection">返回采集记录</BackLink>

      <PageHeader title={title} description={description} bordered={false} />

      <CollectionRunDetail run={run} />
    </div>
  );
}
