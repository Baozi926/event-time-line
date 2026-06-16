export function FilterListLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6 xl:gap-8">
      <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:w-52 lg:overflow-y-auto lg:overscroll-contain lg:pr-1 xl:w-56">
        {sidebar}
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
