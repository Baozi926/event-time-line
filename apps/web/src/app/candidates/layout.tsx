export default function CandidatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-4 min-w-0 overflow-x-clip px-4 sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}
