type StatItem = {
  label: string;
  value: string | number;
  accent?: 'brand' | 'orange';
};

export function PageHeader({
  title,
  description,
  eyebrow,
  children,
  className,
  bordered = true,
  variant = 'default',
  stats,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
  bordered?: boolean;
  variant?: 'default' | 'playful';
  stats?: StatItem[];
}) {
  if (variant === 'playful') {
    return (
      <section
        className={`relative overflow-hidden rounded-[1.75rem] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50 to-orange-50 px-5 py-6 shadow-sm sm:px-7 ${className ?? ''}`}
      >
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-200/40 blur-2xl" />
        <div className="absolute -bottom-16 left-12 h-40 w-40 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-brand-700 shadow-sm">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
            {(stats?.length ?? 0) > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/75 p-2 shadow-sm backdrop-blur">
                {stats!.map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl px-4 py-3 text-center ${
                      stat.accent === 'orange' ? 'bg-orange-50' : 'bg-brand-50'
                    }`}
                  >
                    <p
                      className={`text-2xl font-black tabular-nums ${
                        stat.accent === 'orange'
                          ? 'text-orange-600'
                          : 'text-brand-700'
                      }`}
                    >
                      {stat.value}
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-medium ${
                        stat.accent === 'orange'
                          ? 'text-orange-700/70'
                          : 'text-brand-700/70'
                      }`}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {children}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className={`${bordered ? 'mb-8 border-b border-slate-200/70 pb-6' : 'mb-6'} ${className ?? ''}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
