export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-screen relative left-1/2 -mt-8 -mb-8 flex h-[calc(100dvh-3.5rem)] w-screen -translate-x-1/2 flex-col overflow-hidden px-3 py-2 sm:px-4">
      {children}
    </div>
  );
}
