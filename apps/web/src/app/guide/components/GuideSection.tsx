export function GuideSection({
  id,
  step,
  title,
  summary,
  children,
}: {
  id: string;
  step: number;
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {summary && (
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {summary}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function GuideCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-5 ${className ?? ''}`}>{children}</div>
  );
}

export function GuideCallout({
  title,
  children,
  variant = 'info',
  className,
}: {
  title?: string;
  children: React.ReactNode;
  variant?: 'info' | 'tip';
  className?: string;
}) {
  const styles =
    variant === 'tip'
      ? 'border-amber-100 bg-amber-50/80 text-amber-950'
      : 'border-blue-100 bg-blue-50/80 text-blue-950';

  return (
    <div
      className={`rounded-xl border p-4 text-sm leading-relaxed ${styles} ${className ?? ''}`}
    >
      {title && <p className="mb-1 font-medium">{title}</p>}
      {children}
    </div>
  );
}
