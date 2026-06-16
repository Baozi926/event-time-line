import Link from 'next/link';

const FILTER_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'tracked', label: '加入关注' },
  { value: 'untracked', label: '取消关注' },
] as const;

export function TrackingHistoryFilters({
  activeAction,
  total,
}: {
  activeAction?: string;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => {
          const active = (activeAction ?? '') === opt.value;
          const params = new URLSearchParams({ view: 'history' });
          if (opt.value) params.set('action', opt.value);
          const href = `/?${params.toString()}`;
          return (
            <Link
              key={opt.value || 'all'}
              href={href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
      <p className="text-sm text-slate-500">共 {total} 条记录</p>
    </div>
  );
}
