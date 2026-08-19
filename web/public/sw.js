// Landnam service worker — cache-first for app shell and static assets,
// pass-through for PocketBase API calls so the game handles cold-start
// delays itself rather than serving stale API responses.
// Also handles Web Push notifications (opt-in).

const CACHE = 'landnam-shell-v5'

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
          const toCache = res.clone()
          caches.open(CACHE).then(c => c.put(request, toCache))
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Static assets are content-addressed — cache-first is always safe and
  // makes repeat visits instant. Screen routes (/game/hub, /game/market, ...)
  // must NOT match here: they're dynamic app navigation, not static files,
  // and were previously getting permanently cache-first'd by this same
  // '/game/' prefix check — a stale first-cached screen (e.g. /game/market,
  // the common post-mission landing screen) would then be served forever
  // regardless of actual game state. Only match real static files (an
  // extension in the last path segment) under /game/.
  const isGameStaticAsset = url.pathname.startsWith('/game/') && /\.[a-zA-Z0-9]+$/.test(url.pathname)
  if (url.pathname.startsWith('/_next/static/') || isGameStaticAsset) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          if (res.ok) {
            const toCache = res.clone()
            caches.open(CACHE).then(c => c.put(request, toCache))
          }
          return res
        }).catch(() => new Response('', { status: 504 }))
      })
    )
    return
  }

  // HTML pages — network-first, fall back to cache, then /offline.
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const toCache = res.clone()
          caches.open(CACHE).then(c => c.put(request, toCache))
        }
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

// The installed Landnam PWA warms TakeOn at idle. Next emits hashed chunk
// names, so the client reports just-fetched same-origin static URLs here for
// durable caching instead of hard-coding a build-specific asset list.
self.addEventListener('message', event => {
  const data = event.data
  if (data?.type !== 'CACHE_URLS' || !Array.isArray(data.urls)) return

  const urls = data.urls
    .filter(url => typeof url === 'string')
    .slice(0, 64)
    .reduce((accepted, rawUrl) => {
      try {
        const url = new URL(rawUrl, self.location.origin)
        if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
          accepted.push(url.href)
        }
      } catch {
        // Ignore malformed optional warm-up URLs from a page client.
      }
      return accepted
    }, [])

  const cacheUrls = caches.open(CACHE).then(async cache => {
    await Promise.all(urls.map(async url => {
      try {
        const response = await fetch(url)
        if (response.ok) await cache.put(url, response)
      } catch {
        // A failed optional warm-up must never make the offline shell fail.
      }
    }))
    event.ports[0]?.postMessage({ type: 'CACHE_URLS_COMPLETE', urls })
  })
  event.waitUntil(cacheUrls)
})

self.addEventListener('push', event => {
  let data = { title: 'Landnam', body: 'Something happened in your space program.' }
  try { data = event.data?.json() ?? data } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.url ?? '/game',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data ?? '/game'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('/game'))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
