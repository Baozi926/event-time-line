import Link from 'next/link';

export function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-brand-600">
          Event Timeline
        </Link>
        <nav className="flex gap-6 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-brand-600">
            关注中
          </Link>
          <Link href="/candidates" className="hover:text-brand-600">
            候选池
          </Link>
        </nav>
      </div>
    </header>
  );
}
