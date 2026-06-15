// Landnam service worker — cache-first for app shell and static assets,
// pass-through for PocketBase API calls so the game handles cold-start
// delays itself rather than serving stale API responses.

const CACHE = 'landnam-shell-v2'

const SHELL = [
  '/',
  '/game',
  '/offline',
  '/manifest.webmanifest',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // PocketBase API calls go straight to the network — the game already
  // handles cold-start failures and retries internally. Caching PB responses
  // here would serve stale data or mask warming errors.
  if (
    url.port === '8090' ||
    url.port === '8091' ||
    url.port === '8092' ||
    url.hostname !== self.location.hostname
  ) return

  // Next.js route data — network-first so navigations always get fresh page
  // props; fall back to cache when offline.
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()))
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Static assets are content-addressed — cache-first is always safe and
  // makes repeat visits instant.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/game/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()))
          return res
        })
      })
    )
    return
  }

  // HTML pages — network-first, fall back to cache, then /offline.
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()))
        return res
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const offline = await caches.match('/offline')
        return offline ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
      })
  )
})
