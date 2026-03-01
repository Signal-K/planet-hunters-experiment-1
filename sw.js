/* Star Sailors: Experiment 1 — Service Worker */
const SW_VERSION = "v3";
const SHELL_CACHE = `star-sailors-shell-${SW_VERSION}`;
const GAME_CACHE = `star-sailors-game-${SW_VERSION}`;

const SHELL_FILES = ["/", "/react-shell.js", "/manifest.json"];

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

  // Cache-first for large game assets (.pck, .wasm, .js, .png under /game/)
  if (url.pathname.startsWith("/game/")) {
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

  // Network-first for shell — fall back to cache when offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
