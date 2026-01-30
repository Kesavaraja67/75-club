import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 md:flex-row">
      <Sidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 md:pl-0 w-full min-h-screen">
        <main className="flex-1 p-4 sm:px-6 sm:py-0 mb-16 md:mb-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
