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
    <div className="rounded-[1.35rem] border border-dashed border-blue-200/80 bg-gradient-to-br from-white via-blue-50/30 to-orange-50/20 px-8 py-14 text-center shadow-sm backdrop-blur-sm">
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
