export function PageHeader({
  title,
  description,
  children,
  className,
  bordered = true,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
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
