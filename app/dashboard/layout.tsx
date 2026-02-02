
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - CRITICAL for protecting dashboard access
  const supabase = await createClient();
  
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    // Token might be invalid or expired
    console.error("Dashboard auth check failed:", error);
    // User remains null, will trigger redirect below
  }
  
  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

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
