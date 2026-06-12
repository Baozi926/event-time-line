import { getEvents } from '@/lib/api';
import { EventCard } from '@/components/EventCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let events: Awaited<ReturnType<typeof getEvents>> | null = null;
  let error: string | null = null;

  try {
    events = await getEvents({ sort: 'heat', limit: 30 });
  } catch (e) {
    error = e instanceof Error ? e.message : '加载失败';
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">关注中的热点</h1>
        <p className="mt-1 text-sm text-slate-500">
          系统自动筛选并持续追踪的全球热点事件
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          无法连接 API：{error}。请确认 API 服务已启动且已运行数据采集。
        </div>
      )}

      {events && events.events.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          <p className="mb-2">暂无关注中的热点事件</p>
          <p className="text-sm">
            运行 <code className="rounded bg-slate-100 px-1">pnpm worker:run</code>{' '}
            开始采集，或到{' '}
            <a href="/candidates" className="text-brand-600 underline">
              候选池
            </a>{' '}
            手动加入关注
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {events?.events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
