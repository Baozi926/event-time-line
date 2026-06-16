const VARIANTS = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100 shadow-sm',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200/60',
  orange: 'bg-orange-50 text-orange-700 ring-orange-100 shadow-sm',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100 shadow-sm',
  blue: 'bg-blue-50 text-blue-700 ring-blue-100 shadow-sm',
};

export function Badge({
  variant = 'slate',
  children,
}: {
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
