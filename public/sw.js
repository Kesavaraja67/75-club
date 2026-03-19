/**
 * 75 Club – Custom Service Worker
 * Strategy:
 *   - NEVER cache: /api/*, /auth/*, /dashboard/*, *.supabase.co/*,
 *                  /_next/data/*, App Router RSC payloads (?_rsc / RSC header)
 *   - CACHE-FIRST: /_next/static/*, /icons/*, /app-logo.png, /manifest.json, fonts
 *   - NETWORK-FIRST + offline fallback (navigate only): everything else
 *
 * Lifecycle:
 *   - install  → skipWaiting (activate immediately, no "waiting" limbo)
 *   - activate → clients.claim + delete only KNOWN old cache versions
 */

const CACHE_VERSION = "v3";
const STATIC_CACHE = `static-shell-${CACHE_VERSION}`;

// All known previous cache names — add here when bumping CACHE_VERSION
const KNOWN_CACHES = [
  "static-shell-v1",
  "static-shell-v2",
  // v3 is current — not listed here, it will be kept
];

// One-time cleanup: delete legacy next-pwa/workbox caches on activate
const LEGACY_CACHE_PREFIXES = ["workbox-", "next-pwa-"];

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

/**
 * Returns true if the request must always go to the network (no caching).
 * Accepts the full Request object so we can inspect headers and query params.
 */
function isNetworkOnly(request) {
  const url = new URL(request.url);
  const { hostname, pathname, searchParams } = url;

  // Supabase API / Auth endpoints
  if (hostname.endsWith(".supabase.co")) return true;

  // Internal API routes (includes /api/chat, /api/scan, /api/payment/*)
  if (pathname.startsWith("/api/")) return true;

  // Auth pages / callbacks
  if (pathname.startsWith("/auth/")) return true;

  // Dashboard routes (server-side auth redirect must always hit the network)
  if (pathname.startsWith("/dashboard")) return true;

  // Next.js Pages Router data fetching payloads
  if (pathname.startsWith("/_next/data/")) return true;

  // Next.js App Router RSC requests — detected via query param or request header
  if (searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC") === "1") return true;

  // Hot-module-replacement chunks in development
  if (pathname.startsWith("/_next/webpack-hmr")) return true;

  return false;
}

/**
 * Returns true if the asset should be served from cache-first.
 * Only known immutable/shell paths — NOT a broad extension regex.
 */
function isCacheFirst(url) {
  const { hostname, pathname } = new URL(url);

  // Next.js build hashes — immutable (filename contains build hash)
  if (pathname.startsWith("/_next/static/")) return true;

  // Specific known shell assets (exact paths, not extension glob)
  if (pathname === "/app-logo.png") return true;
  if (pathname === "/manifest.json") return true;
  if (pathname === "/icon-192.png") return true;
  if (pathname === "/icon-512.png") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/icons/")) return true;

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
      // Delete explicitly KNOWN old cache versions, OR any legacy Workbox/next-pwa caches.
      // This avoids purging completely unknown caches (which might belong to other tools)
      // while safely bridging the gap from the old auto-generated SW.
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => {
              // Delete if it's explicitly in our old version list
              if (KNOWN_CACHES.includes(key)) return true;
              // OR if it's a legacy auto-generated cache from the previous setup
              if (LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) return true;
              return false;
            })
            .map((key) => caches.delete(key))
        )
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
  if (isNetworkOnly(request)) {
    event.respondWith(fetch(request));
    return;
  }

  // ── 2. Cache-first (known immutable shell assets) ─────────────────────────
  if (isCacheFirst(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        // Not in cache yet — fetch, store, and return
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            event.waitUntil(cache.put(request, networkResponse.clone()));
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

  // ── 3. Network-first with offline fallback (HTML navigations, etc.) ───────
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Only cache successful HTML document navigations (not JSON, not errors)
        if (
          networkResponse.ok &&
          request.mode === "navigate" &&
          networkResponse.headers.get("content-type")?.includes("text/html")
        ) {
          // Attach cache write to the event lifetime so it completes even if
          // the SW is torn down immediately after respondWith returns.
          event.waitUntil(
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, networkResponse.clone())),
          );
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network failed — try the cache
        const cached = await caches.match(request);
        if (cached) return cached;

        // Only show the offline page for full document navigations.
        // RSC subresource requests (mode "cors") must NOT receive HTML.
        if (request.mode === "navigate") {
          const offlinePage = await caches.match("/offline.html");
          if (offlinePage) return offlinePage;
        }

        // Absolute last resort for non-navigate requests
        return new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      }),
  );
});
