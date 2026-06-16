'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const PUBLIC_LINKS = [
  {
    href: '/',
    label: '我的关注',
    match: (p: string) =>
      p === '/' || p.startsWith('/events'),
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
    href: '/guide',
    label: '系统说明',
    match: (p: string) => p.startsWith('/guide'),
  },
] as const;

const ADMIN_LINKS = [
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
] as const;

export function Nav() {
  const pathname = usePathname();
  const { user, loading, logout, isAdmin } = useAuth();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const links = isAdmin ? [...PUBLIC_LINKS, ...ADMIN_LINKS] : [...PUBLIC_LINKS];

  async function confirmLogout() {
    setLogoutLoading(true);
    setFeedback(null);
    try {
      await logout();
      setLogoutConfirmOpen(false);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '退出登录失败');
    } finally {
      setLogoutLoading(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-blue-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="shrink-0 bg-gradient-to-r from-brand-600 to-blue-500 bg-clip-text text-lg font-black tracking-tight text-transparent transition-opacity hover:opacity-80 sm:text-xl"
        >
          拾光纪
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <nav className="flex gap-0.5 overflow-x-auto sm:gap-1">
            {links.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap rounded-xl px-2 py-1.5 text-sm font-semibold transition-all duration-200 sm:px-3 ${
                    active
                      ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm shadow-blue-200/50'
                      : 'text-slate-600 hover:bg-blue-50 hover:text-brand-700'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden h-6 w-px shrink-0 bg-blue-100 sm:block" />

          {!loading && (
            <div className="flex shrink-0 items-center gap-1.5">
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="hidden max-w-[8rem] truncate text-xs font-medium text-slate-500 transition hover:text-brand-600 lg:inline"
                    title="账号设置"
                  >
                    {user.displayName ?? user.email}
                    {isAdmin && (
                      <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700">
                        管理员
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/account"
                    className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 lg:hidden"
                  >
                    账号
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setLogoutConfirmOpen(true);
                    }}
                    className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  >
                    {logoutLoading ? '退出中…' : '退出'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-brand-700"
                  >
                    登录
                  </Link>
                  <Link href="/register" className="btn-primary hidden px-3 py-1.5 text-sm sm:inline-flex">
                    注册
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {feedback && (
        <div
          role="alert"
          className="mx-auto max-w-7xl px-4 pb-3 sm:px-6"
        >
          <span className="inline-block rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            {feedback}
          </span>
        </div>
      )}
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="确定退出登录？"
        description="退出后需要重新登录才能继续管理关注、候选池和系统设置。"
        confirmLabel="退出登录"
        cancelLabel="继续停留"
        variant="destructive"
        loading={logoutLoading}
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </header>
  );
}
