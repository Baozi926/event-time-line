import { getCandidate } from '@/lib/api';
import { Alert } from '@/components/ui/Alert';
import { CandidateDetail } from '../CandidateDetail';
import { CandidateStickyBackNav } from '../CandidateStickyBackNav';
import { resolveCandidatesReturnTo } from '../candidateNavigation';

export const dynamic = 'force-dynamic';

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const backHref = resolveCandidatesReturnTo(returnTo);

  let candidate: Awaited<ReturnType<typeof getCandidate>>['candidate'] | null =
    null;
  let error: string | null = null;

  try {
    ({ candidate } = await getCandidate(id));
  } catch (e) {
    error = e instanceof Error ? e.message : '加载失败';
  }

  if (error || !candidate) {
    return (
      <div>
        <CandidateStickyBackNav backHref={backHref} />
        <Alert variant="error">{error ?? '候选不存在'}</Alert>
      </div>
    );
  }

  return (
    <div>
      <CandidateStickyBackNav backHref={backHref} />
      <CandidateDetail candidate={candidate} returnTo={backHref} />
    </div>
  );
}
