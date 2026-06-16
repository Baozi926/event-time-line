export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-8 py-14 text-center backdrop-blur-sm">
      <p className="font-medium text-slate-600">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-slate-400">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
