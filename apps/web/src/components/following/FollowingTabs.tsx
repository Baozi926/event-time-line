'use client';

import Link from 'next/link';

export type FollowingView = 'events' | 'keywords' | 'history';

const TABS: { id: FollowingView; label: string; href: string }[] = [
  { id: 'events', label: '事件关注', href: '/' },
  { id: 'keywords', label: '关键词关注', href: '/?view=keywords' },
  { id: 'history', label: '操作历史', href: '/?view=history' },
];

export function FollowingTabs({
  activeView,
  eventCount,
  keywordCount,
  historyCount,
  showHistory = false,
}: {
  activeView: FollowingView;
  eventCount?: number;
  keywordCount?: number;
  historyCount?: number;
  showHistory?: boolean;
}) {
  const countFor = (id: FollowingView) => {
    if (id === 'events') return eventCount;
    if (id === 'keywords') return keywordCount;
    return historyCount;
  };

  const tabs = showHistory ? TABS : TABS.filter((t) => t.id !== 'history');

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
