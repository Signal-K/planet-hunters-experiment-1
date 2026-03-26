const CACHE = 'kanban-v2';
const STATIC_ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Don't intercept non-GET or cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API: network-first, cache fallback (offline reading)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first, network fallback
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(resp => {
        if (resp.ok) {
          caches.open(CACHE).then(c => c.put(request, resp.clone()));
        }
        return resp;
      }).catch(() => caches.match('/'));
    })
  );
});

// On message: force refresh cache
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
