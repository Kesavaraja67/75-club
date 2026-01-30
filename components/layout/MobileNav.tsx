"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings, Home, Sparkles, Calendar, BookOpen, BarChart } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Stats", href: "/dashboard/stats", icon: BarChart },
    { name: "Schedule", href: "/dashboard/schedule", icon: BookOpen },
    { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
    { name: "AI Buddy", href: "/dashboard/buddy", icon: Sparkles },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg z-50">
      <div className="flex justify-around items-center h-16">
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              pathname === link.href ? "text-primary" : "text-muted-foreground hover:text-primary/70"
            )}
          >
            <link.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{link.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
