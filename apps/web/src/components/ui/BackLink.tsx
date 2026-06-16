import Link from 'next/link';

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-brand-600"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}
