import { redirect } from 'next/navigation';

export default async function TrackingHistoryRedirect({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const params = new URLSearchParams({ view: 'history' });
  if (action === 'tracked' || action === 'untracked') {
    params.set('action', action);
  }
  redirect(`/?${params.toString()}`);
}
