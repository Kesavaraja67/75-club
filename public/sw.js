/**
 * 75 Club – Custom Service Worker
 * Strategy:
 *   - NEVER cache: /api/*, /auth/*, /dashboard/*, *.supabase.co/*, /_next/data/*
 *   - CACHE-FIRST: /_next/static/*, /icons/*, /app-logo.png, /manifest.json, fonts
 *   - NETWORK-FIRST + offline fallback: everything else
 *
 * Lifecycle:
 *   - install  → skipWaiting (activate immediately, no "waiting" limbo)
 *   - activate → clients.claim + delete ALL old caches
 */

const CACHE_VERSION = "v3";
const STATIC_CACHE = `static-shell-${CACHE_VERSION}`;

/**
 * Files to precache on install — the offline shell.
 * Keep this small; only truly static, fingerprint-free assets.
 */
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/app-logo.png",
  "/icon-192.png",
  "/icon-512.png",
];

// ─── Patterns that must NEVER be cached ──────────────────────────────────────

/** Returns true if the request must always go to the network (no caching). */
function isNetworkOnly(url) {
  const { hostname, pathname } = new URL(url);

  // Supabase API / Auth endpoints
  if (hostname.endsWith(".supabase.co")) return true;

  // Internal API routes (includes /api/chat, /api/scan, /api/payment/*)
  if (pathname.startsWith("/api/")) return true;

  // Auth pages / callbacks
  if (pathname.startsWith("/auth/")) return true;

  // Dashboard routes (server-side auth redirect must always hit the network)
  if (pathname.startsWith("/dashboard")) return true;

  // Next.js RSC / data fetching payloads
  if (pathname.startsWith("/_next/data/")) return true;

  // Hot-module-replacement chunks in development (shouldn't reach SW but guard anyway)
  if (pathname.startsWith("/_next/webpack-hmr")) return true;

  return false;
}

/** Returns true if the asset should be served from cache-first. */
function isCacheFirst(url) {
  const { hostname, pathname } = new URL(url);

  // Next.js build hashes — immutable
  if (pathname.startsWith("/_next/static/")) return true;

  // Our public icons / logo / manifest
  if (pathname === "/app-logo.png") return true;
  if (pathname === "/manifest.json") return true;
  if (pathname.startsWith("/icons/")) return true;
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/.test(pathname)) return true;

  // Google Fonts — external, versioned
  if (hostname === "fonts.gstatic.com") return true;
  if (hostname === "fonts.googleapis.com") return true;

  return false;
}

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()), // activate immediately
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Delete ALL old caches (clean slate on every deploy)
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== STATIC_CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
      // Take control of all open tabs immediately
      self.clients.claim(),
    ]),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests; let POST/PUT/DELETE pass through untouched
  if (request.method !== "GET") return;

  const url = request.url;

  // Skip non-http(s) (chrome-extension://, etc.)
  if (!url.startsWith("http")) return;

  // ── 1. Network-only (never serve from cache) ──────────────────────────────
  if (isNetworkOnly(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // ── 2. Cache-first (static assets with immutable hashes) ─────────────────
  if (isCacheFirst(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        // Not in cache yet — fetch, store, and return
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // Static asset not cached and network failed — nothing we can do
          return new Response("Asset unavailable offline", { status: 503 });
        }
      }),
    );
    return;
  }

  // ── 3. Network-first with offline fallback (HTML pages, etc.) ────────────
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Only cache successful HTML responses (not JSON, not errors)
        if (
          networkResponse.ok &&
          networkResponse.headers.get("content-type")?.includes("text/html")
        ) {
          caches
            .open(STATIC_CACHE)
            .then((cache) => cache.put(request, networkResponse.clone()));
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network failed — try the cache
        const cached = await caches.match(request);
        if (cached) return cached;

        // Nothing in cache — show offline page
        const offlinePage = await caches.match("/offline.html");
        if (offlinePage) return offlinePage;

        // Absolute last resort
        return new Response(
          "<!DOCTYPE html><html><body><h1>You are offline</h1></body></html>",
          {
            status: 503,
            headers: { "Content-Type": "text/html" },
          },
        );
      }),
  );
});
