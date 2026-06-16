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
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
      {TABS.map((tab) => {
        const active = activeView === tab.id;
        const badge = badgeFor(tab.id);
        const isFailBadge = tab.id === 'rss' && rssFailCount !== undefined && rssFailCount > 0;

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
            {badge !== undefined && (
              <span
                className={`ml-1.5 tabular-nums text-xs ${
                  isFailBadge && !active
                    ? 'font-medium text-red-600'
                    : 'opacity-70'
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
