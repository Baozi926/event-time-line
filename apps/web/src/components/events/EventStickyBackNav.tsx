import Link from 'next/link';
import { SITE_NAV_OFFSET } from '@/app/candidates/CandidateStickyBackNav';

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function EventStickyBackNav({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  return (
    <div
      className="sticky z-40 -mx-4 mb-3 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md sm:-mx-6"
      style={{ top: SITE_NAV_OFFSET }}
    >
      <div className="flex h-10 items-center justify-between gap-3 px-4 sm:px-6">
        <nav
          aria-label="面包屑"
          className="flex min-w-0 items-center gap-1.5 sm:gap-2"
        >
          <Link
            href={backHref}
            scroll={false}
            className="group inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200/90 bg-slate-50/80 py-1.5 pl-1.5 pr-3 text-sm font-medium text-slate-700 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <ChevronLeftIcon className="h-5 w-5 text-slate-500 transition-colors group-hover:text-brand-600" />
            <span className="hidden sm:inline">返回</span>
            <span>{backLabel}</span>
          </Link>

          <span className="shrink-0 text-slate-300" aria-hidden>
            /
          </span>

          <span
            className="truncate text-sm font-medium text-slate-900"
            aria-current="page"
          >
            详情
          </span>
        </nav>
      </div>
    </div>
  );
}

export { CANDIDATE_DETAIL_STICKY_TOP as EVENT_DETAIL_STICKY_TOP } from '@/app/candidates/CandidateStickyBackNav';
