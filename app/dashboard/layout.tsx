
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
    const { data, error } = await supabase.auth.getUser();
    
    // AuthApiError from Supabase signifies the token is literally invalid/expired
    if (error) {
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error; // Let the catch block handle the redirect
      }
      // If it's a 5xx or network timeout -> service failure, NOT an auth invalidation
      throw new Error(`Auth Service Error: ${error.message}`);
    }
    
    user = data.user;
  } catch (error: unknown) {
    // If it's a *true* auth failure, redirect to login
    const isAuthError = 
      error && 
      typeof error === 'object' && 
      ('name' in error && error.name === 'AuthApiError' || 
      ('status' in error && typeof error.status === 'number' && error.status >= 400 && error.status < 500));
      
    if (isAuthError) {
      redirect('/login?redirect=/dashboard');
    }
    
    // If it's a network timeout, throw it to trigger error.tsx so the user can hit "Retry"
    // instead of being kicked to the login screen.
    throw error;
  }
  
  // Fallback if data was weirdly empty
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
