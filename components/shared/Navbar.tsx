"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { fetchSubscriptionStatus, SubscriptionStatus } from "@/lib/subscription";
import Image from "next/image";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session) {
        const status = await fetchSubscriptionStatus();
        setSubscription(status);
      }
    };
    
    checkAuth();

    // 2. Fix shadowing: Rename destuctured variable
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (_event: import("@supabase/supabase-js").AuthChangeEvent, session: import("@supabase/supabase-js").Session | null) => {
      setIsAuthenticated(!!session);
      if (session) {
        const status = await fetchSubscriptionStatus();
        setSubscription(status);
      } else {
        setSubscription(null);
      }
    });

    return () => {
      authListener.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error);
      return; // Stop if sign out failed
    }
    // Force hard reload to clear any client-side state/cache
    window.location.href = "/";
  };

  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/signup");
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/app-logo.png" alt="75 Club Logo" width={32} height={32} className="object-contain" />
            <span className="font-display font-black text-xl">75 Club</span>
            {subscription?.isProUser && (
              <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black ml-2">
                PRO
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {!isAuthPage && !isDashboard && (
              <>
                <Link href="/#features" className="text-sm font-medium hover:text-primary transition-colors">
                  Features
                </Link>
                <Link href="/#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
                  How it Works
                </Link>
                <Link href="/#pricing" className="text-sm font-medium hover:text-primary transition-colors">
                  Pricing
                </Link>
              </>
            )}
            
            {isAuthenticated === true ? (
              <>
                {!isDashboard && (
                  <Link href="/dashboard">
                    <Button variant="ghost">Dashboard</Button>
                  </Link>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              </>
            ) : isAuthenticated === false ? (
              <>
                <Link href="/login">
                  <Button variant="ghost">Log In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t">
            {!isAuthPage && !isDashboard && (
              <>
                <Link 
                  href="/#features" 
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </Link>
                <Link 
                  href="/#how-it-works" 
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  How it Works
                </Link>
                <Link 
                  href="/#pricing" 
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
              </>
            )}
            
            {isAuthenticated === true ? (
              <>
                {!isDashboard && (
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
                  </Link>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              </>
            ) : isAuthenticated === false ? (
              <>
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full">Log In</Button>
                </Link>
                <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              </>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
}
