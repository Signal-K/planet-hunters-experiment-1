// Kill switch: any previously-installed worker that fetches this file will
// see it has changed, install it, and this code takes over immediately —
// clearing all caches and unregistering itself so the page falls back to
// normal network requests. This undoes the old stale-while-revalidate
// worker, which caused infinite reload loops against the Turbopack dev
// server (every request got a different build id, so the HMR client kept
// reloading, and the SW kept serving the same stale cached page).
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(client => client.navigate(client.url)))
  )
})
