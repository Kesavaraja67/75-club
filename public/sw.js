self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const targetCaches = keys.filter(key => 
        key.startsWith('static-shell-') || 
        key.startsWith('workbox-') || 
        key.startsWith('next-pwa-')
      );
      return Promise.all(targetCaches.map((key) => caches.delete(key)));
    }).catch((err) => {
      console.error('[SW] Cache deletion failed:', err);
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', () => {
  // Do nothing, let the browser handle it
});
