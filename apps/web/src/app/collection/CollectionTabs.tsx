'use client';

import Link from 'next/link';

export type CollectionView = 'runs' | 'rss' | 'gdelt';

const TABS: { id: CollectionView; label: string; href: string }[] = [
  { id: 'runs', label: '运行记录', href: '/collection' },
  { id: 'rss', label: '今日 RSS 源', href: '/collection?view=rss' },
  { id: 'gdelt', label: '今日 GDELT 分类', href: '/collection?view=gdelt' },
];

export function CollectionTabs({
  activeView,
  runsCount,
  rssFailCount,
  gdeltTodayFound,
}: {
  activeView: CollectionView;
  runsCount?: number;
  rssFailCount?: number;
  gdeltTodayFound?: number;
}) {
  const badgeFor = (id: CollectionView) => {
    if (id === 'runs' && runsCount !== undefined) {
      return runsCount;
    }
    if (id === 'rss' && rssFailCount !== undefined && rssFailCount > 0) {
      return `${rssFailCount} 失败`;
    }
    if (id === 'gdelt' && gdeltTodayFound !== undefined && gdeltTodayFound > 0) {
      return `${gdeltTodayFound} 条`;
    }
    return undefined;
  };

  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-blue-100/80 bg-white/80 p-1.5 shadow-sm backdrop-blur">
      {TABS.map((tab) => {
        const active = activeView === tab.id;
        const badge = badgeFor(tab.id);
        const isFailBadge =
          tab.id === 'rss' && rssFailCount !== undefined && rssFailCount > 0;

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
            {badge !== undefined && (
              <span
                className={`ml-1.5 tabular-nums text-xs ${
                  isFailBadge && !active
                    ? 'font-medium text-red-600'
                    : 'opacity-75'
                }`}
              >
                ({badge})
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
