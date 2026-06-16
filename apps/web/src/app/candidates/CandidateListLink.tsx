'use client';

import Link from 'next/link';
import {
  buildCandidateDetailPath,
  saveCandidatesListScroll,
} from './candidateNavigation';

export function CandidateListLink({
  candidateId,
  listPath,
  className,
  children,
}: {
  candidateId: string;
  listPath: string;
  className?: string;
  children: React.ReactNode;
}) {
  const href = buildCandidateDetailPath(candidateId, listPath);

  return (
    <Link
      id={`candidate-${candidateId}`}
      href={href}
      className={className}
      onClick={() => saveCandidatesListScroll(listPath, candidateId)}
    >
      {children}
    </Link>
  );
}
