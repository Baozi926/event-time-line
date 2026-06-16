'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const GUIDE_LINKS = [
  { href: '/guide', label: '概览', exact: true },
  { href: '/guide/sources', label: '信息采集', exact: false },
];

export function GuideNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-2 text-sm">
      {GUIDE_LINKS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full border px-3 py-1 shadow-sm transition-colors ${
              active
                ? 'border-brand-500/40 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-500/30 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
