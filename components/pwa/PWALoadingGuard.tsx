"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAndroidBackButtonLock } from "@/hooks/useAndroidBackButtonLock";
import { isInstalledPWA } from "@/lib/pwa-utils";

/**
 * PWALoadingGuard
 *
 * Shows a branded splash screen while Supabase restores the auth session on
 * cold-start. Only activates in PWA standalone mode — normal browser tabs
 * skip straight to children with zero delay.
 *
 * Strategy:
 *  1. Detect standalone mode synchronously in useState initializer (no effect)
 *  2. If standalone: show splash, subscribe to INITIAL_SESSION via onAuthStateChange
 *  3. Also call getSession() as a belt-and-suspenders fallback
 *  4. Hard 5-second timeout so the user is never permanently blocked
 */

export default function PWALoadingGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOnline } = useNetworkStatus(); // Initialize global network monitoring
  useAndroidBackButtonLock(); // Initialize global hardware back button lock
  
  // Initialize ready = true for normal browser tabs (no splash needed)
  // Initialize ready = false only in PWA standalone mode
  const [ready, setReady] = useState<boolean>(() => !isInstalledPWA());
  const resolvedRef = useRef(false);

  const resolve = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setReady(true);
  };

  useEffect(() => {
    // If already ready (non-PWA), nothing to do
    if (ready) return;

    if (!isOnline) {
      resolve();
      return;
    }

    const supabase = createClient();

    // Hard timeout — never block for more than 5 seconds
    const timeout = setTimeout(() => {
      console.warn("[PWALoadingGuard] Auth timeout — proceeding anyway");
      resolve();
    }, 5000);

    // onAuthStateChange fires INITIAL_SESSION once SDK has restored the session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT"
      ) {
        clearTimeout(timeout);
        resolve();
      }
    });

    // Belt-and-suspenders: getSession() resolves from localStorage directly
    supabase.auth
      .getSession()
      .then(() => {
        // Give onAuthStateChange ~200 ms to fire first (it has the INITIAL_SESSION event)
        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 200);
      })
      .catch(() => {
        clearTimeout(timeout);
        resolve();
      });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return <PWASplashScreen />;
  }

  return <>{children}</>;
}

/** Branded splash shown during auth session restore in PWA mode */
function PWASplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6"
      style={{ background: "#0a0a0a" }}
      aria-label="Loading 75 Club"
    >
      {/* Logo */}
      <div
        style={{
          borderRadius: 24,
          border: "3px solid #FF6B35",
          padding: 12,
          background: "#111",
          boxShadow: "0 0 40px rgba(255,107,53,0.25)",
        }}
      >
        <Image
          src="/app-logo.png"
          alt="75 Club"
          width={72}
          height={72}
          priority
          style={{ borderRadius: 12, display: "block" }}
        />
      </div>

      {/* App name */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
          }}
        >
          75 Club
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#666",
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          Bunk Smarter. Stay Safe.
        </div>
      </div>

      {/* Spinner */}
      <div style={{ position: "relative", width: 36, height: 36 }}>
        <svg
          viewBox="0 0 36 36"
          fill="none"
          style={{
            width: 36,
            height: 36,
            animation: "pwa-spin 0.8s linear infinite",
          }}
        >
          <circle cx="18" cy="18" r="15" stroke="#222" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15"
            stroke="#FF6B35"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="60 40"
          />
        </svg>
      </div>

      <style>{`
        @keyframes pwa-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
