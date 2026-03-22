self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // CLEAR ALL CACHES — force a fresh start from network for every user
      console.log('[SW] Deleting all caches...');
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      // Take control of all open tabs/clients immediately 
      // so their next requests don't hit an old worker's proxy
      return self.clients.claim();
    }).then(() => {
      console.log('[SW] Unregistering self...');
      return self.registration.unregister();
    }).catch((err) => {
      console.error('[SW] Cleanup failed:', err);
    })
  );
});

self.addEventListener('fetch', () => {
  // Always let the network handle it
});
