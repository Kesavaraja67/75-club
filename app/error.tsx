"use client";

import { useEffect } from "react";

/**
 * Next.js App Router page-level error boundary.
 * Catches errors (including hydration mismatches) within a route segment.
 * In PWA mode, hydration mismatches can happen when the SW serves a cached
 * shell that doesn't match the latest server-rendered HTML — hard reload fixes it.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If this is a hydration error, a hard reload will re-fetch fresh HTML
    // and reconcile with the current SW cache.
    const isHydrationError =
      error.message?.toLowerCase().includes("hydrat") ||
      error.message?.toLowerCase().includes("minified react error");
    // NOTE: we intentionally do NOT include NEXT_NOT_FOUND here.
    // error.digest === "NEXT_NOT_FOUND" means the page called notFound() —
    // that is a legitimate 404, not a hydration issue. Reloading on it would
    // create an infinite reload loop on any valid not-found route.

    if (isHydrationError) {
      // Small delay so React can flush before we reload
      const t = setTimeout(() => window.location.reload(), 300);
      return () => clearTimeout(t);
    }

    console.error("[75Club Error Boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        gap: "16px",
      }}
    >
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
        Something went wrong
      </h2>
      <p style={{ color: "#888", fontSize: 15, maxWidth: 320, margin: 0 }}>
        An unexpected error occurred. This sometimes happens after an app update
        in PWA mode.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            background: "#FF6B35",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#1a1a1a",
            color: "#fff",
            border: "1px solid #333",
            borderRadius: 10,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Reload page
        </button>
        <button
          onClick={async () => {
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (const r of regs) await r.unregister();
            }
            if ("caches" in window) {
              const keys = await caches.keys();
              for (const k of keys) await caches.delete(k);
            }
            window.location.reload();
          }}
          style={{
            background: "#dc2626", // Red for destructive/hard reset
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Clear cache & retry
        </button>
      </div>
    </div>
  );
}
