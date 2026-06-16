'use client';

import Link from 'next/link';

export type FollowingView = 'active' | 'history';

const TABS: { id: FollowingView; label: string; href: string }[] = [
  { id: 'active', label: '关注中', href: '/' },
  { id: 'history', label: '操作历史', href: '/?view=history' },
];

export function FollowingTabs({
  activeView,
  activeCount,
  historyCount,
}: {
  activeView: FollowingView;
  activeCount?: number;
  historyCount?: number;
}) {
  const countFor = (id: FollowingView) =>
    id === 'active' ? activeCount : historyCount;

  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
      {TABS.map((tab) => {
        const active = activeView === tab.id;
        const count = countFor(tab.id);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {count !== undefined && (
              <span className="ml-1.5 tabular-nums text-xs opacity-70">
                ({count})
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
