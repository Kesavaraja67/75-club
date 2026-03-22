self.addEventListener('install', () => {
  self.skipWaiting();
});

// Aggressive Service Worker cleanup script
self.addEventListener('activate', (event) => {
  // Clear ALL caches to ensure no stale assets interfere with auth/loading
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(async () => {
      console.log('[SW] All caches cleared. Unregistering...');
      try {
        const success = await self.registration.unregister();
        if (success) {
          console.log('[SW] Unregistration successful.');
        } else {
          console.warn('[SW] Unregistration returned false.');
        }
      } catch (err) {
        console.error('[SW] Unregistration failed:', err);
      }
    })
  );
});

self.addEventListener('fetch', () => {
  // Always let the network handle it
});
