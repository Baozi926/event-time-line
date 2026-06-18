import { getEvent, getEventSnapshots, getKeywordEventMatches } from '@/lib/api';
import { getMeServer } from '@/lib/auth';
import { resolveCandidatesReturnTo } from '@/app/candidates/candidateNavigation';
import { resolveFollowingBackLabel, resolveFollowingReturnTo } from '@/lib/followingNavigation';
import { Alert } from '@/components/ui/Alert';
import { EventDetailView } from '@/components/events/EventDetailView';
import { EventStickyBackNav } from '@/components/events/EventStickyBackNav';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { slug } = await params;
  const { returnTo } = await searchParams;
  const user = await getMeServer();
  const isAdmin = user?.role === 'admin';

  let event: Awaited<ReturnType<typeof getEvent>> | null = null;
  let snapshots: Awaited<ReturnType<typeof getEventSnapshots>>['snapshots'] = [];
  let keywordMatches: Awaited<ReturnType<typeof getKeywordEventMatches>>['matches'] = [];
  let error: string | null = null;

  try {
    const requests: [
      Promise<Awaited<ReturnType<typeof getEvent>>>,
      Promise<Awaited<ReturnType<typeof getEventSnapshots>>>,
      Promise<Awaited<ReturnType<typeof getKeywordEventMatches>> | null>,
    ] = [
      getEvent(slug),
      getEventSnapshots(slug),
      user ? getKeywordEventMatches(slug).catch(() => null) : Promise.resolve(null),
    ];

    const [eventResult, snapshotsResult, keywordMatchesResult] =
      await Promise.all(requests);

    event = eventResult;
    snapshots = snapshotsResult.snapshots;
    keywordMatches = keywordMatchesResult?.matches ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : '加载失败';
  }

  if (error || !event) {
    return <Alert variant="error">{error ?? '事件不存在'}</Alert>;
  }

  const backHref =
    event.trackingStatus === 'candidate'
      ? resolveCandidatesReturnTo(returnTo)
      : resolveFollowingReturnTo(returnTo);
  const backLabel =
    event.trackingStatus === 'candidate'
      ? '候选池'
      : resolveFollowingBackLabel(returnTo).replace(/^返回/, '');

  return (
    <div>
      <EventStickyBackNav backHref={backHref} backLabel={backLabel} />
      <EventDetailView
        event={event}
        snapshots={snapshots}
        keywordMatches={keywordMatches}
        returnTo={backHref}
        showAdminUntrack={isAdmin && event.trackingStatus === 'tracking'}
      />
    </div>
  );
}
