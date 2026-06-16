const VARIANTS = {
  warning:
    'border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 text-amber-900 shadow-sm shadow-amber-100/50',
  error:
    'border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50/50 text-red-900 shadow-sm shadow-red-100/50',
  info: 'border-blue-200/80 bg-gradient-to-r from-blue-50 to-brand-50/50 text-blue-900 shadow-sm shadow-blue-100/50',
  success:
    'border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-green-50/50 text-emerald-900 shadow-sm shadow-emerald-100/50',
};

export function Alert({
  variant = 'warning',
  children,
}: {
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${VARIANTS[variant]}`}
      role="alert"
    >
      {children}
    </div>
  );
}
