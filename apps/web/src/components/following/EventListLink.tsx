'use client';

import Link from 'next/link';
import {
  buildEventDetailPath,
  saveFollowingListScroll,
} from '@/lib/followingNavigation';

export function EventListLink({
  eventId,
  slug,
  listPath,
  className,
  children,
}: {
  eventId: string;
  slug: string;
  listPath: string;
  className?: string;
  children: React.ReactNode;
}) {
  const href = buildEventDetailPath(slug, listPath);

  return (
    <Link
      id={`event-${eventId}`}
      href={href}
      className={className}
      onClick={() => saveFollowingListScroll(listPath, eventId)}
    >
      {children}
    </Link>
  );
}
