export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col min-h-screen bg-surface overflow-hidden">
      {/* 背景光晕装饰 */}
      <div className="pointer-events-none absolute top-0 left-0 w-96 h-96 rounded-full bg-[#c26b2b]/20 dark:bg-[#c26b2b]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#9c8361]/20 dark:bg-[#c26b2b]/8 blur-3xl" />
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 flex-grow pt-4 sm:pt-14 pb-6 relative z-10">
        {children}
      </main>
    </div>
  );
}
