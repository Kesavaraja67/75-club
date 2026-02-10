"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  BarChart, 
  Calendar, 
  Settings, 
  LogOut, 
  BookOpen,
  User,
  Home,
  Sparkles
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { fetchSubscriptionStatus, SubscriptionStatus } from "@/lib/subscription";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const loadSubscription = async () => {
      const status = await fetchSubscriptionStatus();
      setSubscription(status);
    };
    loadSubscription();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message);
      // Fallback to login anyway
    }
    // Force hard reload to clear any client-side state/cache
    window.location.href = "/login";
  };

  const links = [
    { name: "Home", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Stats", href: "/dashboard/stats", icon: BarChart },
    { name: "Schedule", href: "/dashboard/schedule", icon: BookOpen, pro: true },
    { name: "Calendar", href: "/dashboard/calendar", icon: Calendar, pro: true },
    { name: "AI Buddy", href: "/dashboard/buddy", icon: Sparkles, pro: true },
    { name: "Profile", href: "/dashboard/profile", icon: User },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="hidden border-r bg-muted/40 md:block md:w-64 lg:w-72 h-screen sticky top-0">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image src="/app-logo.png" alt="75 Club Logo" width={24} height={24} className="object-contain" />
            <span className="">75 Club</span>
            {subscription?.isProUser && (
              <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black ml-2">
                PRO
              </span>
            )}
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  pathname === link.href 
                    ? "bg-muted text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.name}
                {link.pro && (
                  <span className="ml-auto text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full">
                    PRO
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <Button 
            variant="outline" 
            className="w-full gap-2 justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
