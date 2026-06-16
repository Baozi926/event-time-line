'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  {
    href: '/',
    label: '我的关注',
    match: (p: string) =>
      p === '/' || p.startsWith('/events') || p.startsWith('/tracking-history'),
  },
  {
    href: '/hot',
    label: '热点',
    match: (p: string) => p.startsWith('/hot'),
  },
  {
    href: '/candidates',
    label: '候选池',
    match: (p: string) => p.startsWith('/candidates'),
  },
  {
    href: '/dashboard',
    label: '监控',
    match: (p: string) => p.startsWith('/dashboard'),
  },
  {
    href: '/collection',
    label: '采集记录',
    match: (p: string) => p.startsWith('/collection'),
  },
  {
    href: '/settings',
    label: '系统设置',
    match: (p: string) => p.startsWith('/settings'),
  },
  {
    href: '/guide',
    label: '系统说明',
    match: (p: string) => p.startsWith('/guide'),
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-brand-600 transition-opacity hover:opacity-80 sm:text-xl"
        >
          Event Timeline
        </Link>
        <nav className="flex gap-1 sm:gap-2">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
