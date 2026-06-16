'use client';

const SECTIONS = [
  { href: '#overview', label: '一图看懂' },
  { href: '#lifecycle', label: '事件生命周期' },
  { href: '#heat', label: '热度计算' },
  { href: '#promote', label: '候选晋升' },
  { href: '#roles', label: '权限分层' },
  { href: '#collection', label: '数据采集' },
  { href: '#sources', label: '来源分级' },
] as const;

export function GuideToc() {
  return (
    <nav aria-label="页面目录" className="space-y-1">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        目录
      </p>
      {SECTIONS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function GuideTocMobile() {
  return (
    <nav
      aria-label="页面目录"
      className="-mx-1 mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden"
    >
      {SECTIONS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-brand-500/30 hover:bg-brand-50 hover:text-brand-700"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
