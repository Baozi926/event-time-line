import { getDashboardStats } from '@/lib/api';
import { DashboardPanel } from './DashboardPanel';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  let error: string | null = null;

  try {
    stats = await getDashboardStats();
  } catch (e) {
    error = e instanceof Error ? e.message : '加载失败';
  }

  return <DashboardPanel initial={stats} error={error} />;
}
