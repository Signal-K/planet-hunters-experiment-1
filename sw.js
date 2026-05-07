/* Landnám — Service Worker */
const SW_VERSION = "v4";
const SHELL_CACHE = `landnam-shell-${SW_VERSION}`;
const GAME_CACHE = `landnam-game-${SW_VERSION}`;

// Pre-cache shell files so installed PWA loads instantly
const SHELL_FILES = ["/", "/react-shell.js", "/manifest.json", "/game/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== GAME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Cache-first for large immutable game assets (.pck, .wasm, versioned .js/.png under /game/)
  if (url.pathname.startsWith("/game/") && url.pathname !== "/game/index.html") {
    event.respondWith(
      caches.open(GAME_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Stale-while-revalidate for shell (HTML, JS, manifest, game/index.html):
  // Serve from cache immediately, then update cache in background.
  // This gives PWA users instant loads on every visit.
  event.respondWith(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => null);
        return cached || networkFetch;
      })
    )
  );
});
