// Landnam service worker — cache-first for app shell and static assets,
// pass-through for PocketBase API calls so the game handles cold-start
// delays itself rather than serving stale API responses.
// Also handles Web Push notifications (opt-in).
//
// Production offline landscape (SSL-66): registered only when NODE_ENV is
// production. The first online visit to /game stores the shell. A later
// reload with the network disabled serves that shell in landscape (844x390
// and 926x428 are not locked out). PocketBase calls stay network-only, so
// restoring the network lets the existing save sync without a new mutation.
// `make up` is development mode and unregisters this worker.

const CACHE = 'landnam-shell-v8'
// SSL-828: science images (Cassini frames) live on Zooniverse's upload host. The game asks for the coming week's
// frames ahead of time (CACHE_SCIENCE) and they are served cache-first, so the Saturn satellite works offline.
const SCIENCE_CACHE = 'landnam-science-v1'
const SCIENCE_HOST = 'panoptes-uploads.zooniverse.org'
const SCIENCE_MAX = 120

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
        keys.filter(k => k !== CACHE && k !== SCIENCE_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.hostname === SCIENCE_HOST) {
    event.respondWith(
      caches.open(SCIENCE_CACHE).then(async cache => {
        const cached = await cache.match(request.url)
        if (cached) return cached
        try {
          const res = await fetch(request)
          if (res.ok || res.type === 'opaque') cache.put(request.url, res.clone()).then(() => trimScience(cache))
          return res
        } catch {
          return new Response('', { status: 504 })
        }
      })
    )
    return
  }

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

  // Next client-side navigation and prefetch fetch the page's RSC payload from
  // the page URL (RSC header / _rsc param). That payload is not HTML. Serving
  // a cached HTML shell for it (the old ignoreSearch fallback did) crashes the
  // router, so flight requests are network-only. When offline we answer with a
  // plain failure and Next falls back to a hard navigation, which the HTML
  // branch below resolves to a shell.
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) {
    event.respondWith(
      fetch(request).catch(() => new Response('', { status: 503, statusText: 'Offline' }))
    )
    return
  }

  const isNavigation = request.mode === 'navigate'

  // HTML pages — network-first, fall back to cache, then a game shell, then /offline.
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok && isNavigation) {
          const toCache = res.clone()
          caches.open(CACHE).then(c => c.put(request, toCache))
        }
        return res
      })
      .catch(async () => {
        // Only navigations may be answered with an HTML document; any other
        // request (fetch/XHR for data) must fail cleanly instead of receiving HTML.
        if (!isNavigation) return new Response('', { status: 503, statusText: 'Offline' })
        const cached = await caches.match(request, { ignoreSearch: url.pathname.startsWith('/game/') })
        if (cached) return cached
        // SSL-729: every game screen renders from the saved state, so any game
        // shell can open an unvisited /game/<screen> offline; the hub shell first.
        if (url.pathname.startsWith('/game/') || url.pathname === '/game') {
          const shell = await caches.match('/game/hub') ?? await caches.match('/game')
          if (shell) return shell
        }
        const offline = await caches.match('/offline')
        return offline ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
      })
  )
})

// Cache a page shell and the hashed chunks it references, so a screen that was
// warmed while online also has the scripts it needs when the network drops.
async function cacheShell(cache, path) {
  if (await cache.match(path)) return
  const response = await fetch(path, { credentials: 'same-origin' })
  if (!response.ok) return
  const html = await response.clone().text()
  await cache.put(path, response)
  const chunks = new Set(html.match(/\/_next\/static\/[^"'\\\s)]+\.(?:js|css)/g) ?? [])
  await Promise.all([...chunks].slice(0, 64).map(async chunk => {
    try {
      if (await cache.match(chunk)) return
      const asset = await fetch(chunk)
      if (asset.ok) await cache.put(chunk, asset)
    } catch {
      // Optional warm-up.
    }
  }))
}

// The installed Landnam PWA warms TakeOn at idle. Next emits hashed chunk
// names, so the client reports just-fetched same-origin static URLs here for
// durable caching instead of hard-coding a build-specific asset list.
self.addEventListener('message', event => {
  const data = event.data
  // SSL-729: the page sends every /game/<screen> path once it is online, so a
  // screen the player never opened still has its shell when the network drops.
  if (data?.type === 'CACHE_SCREENS' && Array.isArray(data.paths)) {
    const paths = data.paths
      .filter(path => typeof path === 'string' && /^\/game\/[a-z0-9-]+$/.test(path))
      .slice(0, 128)
    event.waitUntil(caches.open(CACHE).then(cache => Promise.all(paths.map(async path => {
      try {
        await cacheShell(cache, path)
      } catch {
        // Optional warm-up: a miss only means that screen falls back to the hub shell.
      }
    }))))
    return
  }
  if (data?.type === 'CACHE_SCIENCE' && Array.isArray(data.urls)) {
    const urls = data.urls.filter(raw => {
      try { return new URL(raw).hostname === SCIENCE_HOST } catch { return false }
    }).slice(0, 48)
    event.waitUntil(caches.open(SCIENCE_CACHE).then(async cache => {
      await Promise.all(urls.map(async url => {
        if (await cache.match(url)) return
        try {
          // The upload host may not send CORS headers; an opaque response still renders in <img>.
          const res = await fetch(url, { mode: 'no-cors' })
          if (res.ok || res.type === 'opaque') await cache.put(url, res)
        } catch {
          // Optional warm-up: the next online visit tries again.
        }
      }))
      await trimScience(cache)
    }))
    return
  }
  if (data?.type !== 'CACHE_URLS' || !Array.isArray(data.urls)) return

  const urls = data.urls
    .filter(url => typeof url === 'string')
    .slice(0, 256)
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

/** Keeps the science cache to the newest SCIENCE_MAX images (oldest entries first out). */
async function trimScience(cache) {
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - SCIENCE_MAX)).map(key => cache.delete(key)))
}

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
