export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col min-h-screen bg-[#f5f0ea] dark:bg-[#1a1614] overflow-hidden">
      {/* 背景光晕装饰 */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[#c96442]/20 dark:bg-[#c96442]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#c9a882]/20 dark:bg-[#c96442]/8 blur-3xl" />
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 flex-grow pt-4 sm:pt-16 relative z-10">
        {children}
      </main>
    </div>
  );
}
