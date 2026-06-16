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
  showHistory = false,
}: {
  activeView: FollowingView;
  activeCount?: number;
  historyCount?: number;
  showHistory?: boolean;
}) {
  const countFor = (id: FollowingView) =>
    id === 'active' ? activeCount : historyCount;

  const tabs = showHistory ? TABS : TABS.filter((t) => t.id === 'active');

  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-blue-100/80 bg-white/80 p-1.5 shadow-sm backdrop-blur">
      {tabs.map((tab) => {
        const active = activeView === tab.id;
        const count = countFor(tab.id);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              active
                ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm shadow-blue-200'
                : 'text-slate-600 hover:bg-blue-50 hover:text-brand-700'
            }`}
          >
            <span
              className={`mr-2 h-2 w-2 rounded-full ${
                active ? 'bg-white' : 'bg-blue-200'
              }`}
            />
            {tab.label}
            {count !== undefined && (
              <span className="ml-1.5 tabular-nums text-xs opacity-75">
                ({count})
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
