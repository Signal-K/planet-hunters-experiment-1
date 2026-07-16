// Regression test for the sw.js bug where dynamic screen routes
// (/game/hub, /game/market, ...) matched the same '/game/' prefix used
// for static assets and were served cache-first. That meant whichever
// screen a device first cached (commonly /game/market, the post-mission
// debrief landing screen) was served forever from cache regardless of
// live game state. See public/sw.js.

function registerServiceWorker(win: Cypress.AUTWindow) {
  return win.navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then(() => win.navigator.serviceWorker.ready)
    .then(() => {
      if (win.navigator.serviceWorker.controller) return
      return new Promise<void>(resolve => {
        win.navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
      })
    })
}

describe('Service worker caching strategy', () => {
  before(() => {
    cy.visit('/game', { onBeforeLoad(win) { win.localStorage.clear() } })
    cy.window().then(win => registerServiceWorker(win))
  })

  after(() => {
    cy.window().then(async win => {
      const regs = await win.navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
      const keys = await win.caches.keys()
      await Promise.all(keys.map(k => win.caches.delete(k)))
    })
  })

  it('never serves a stale cached response for a screen route, but still cache-firsts real static assets', () => {
    cy.window().then(async win => {
      const cacheKeys = await win.caches.keys()
      expect(cacheKeys, 'service worker created a shell cache').to.have.length.greaterThan(0)
      const cache = await win.caches.open(cacheKeys[0])

      // Poison the cache with fake stale responses for two screen routes, as
      // if the device had cached them once before (very common for
      // /game/market — the post-mission debrief landing screen) and the
      // game state had since moved on.
      await cache.put(
        new win.Request(`${win.location.origin}/game/hub`),
        new win.Response('STALE_CACHED_SCREEN_MARKER', { status: 200, headers: { 'Content-Type': 'text/html' } }),
      )
      await cache.put(
        new win.Request(`${win.location.origin}/game/market`),
        new win.Response('STALE_CACHED_SCREEN_MARKER', { status: 200, headers: { 'Content-Type': 'text/html' } }),
      )

      const hubBody = await win.fetch('/game/hub').then(res => res.text())
      expect(hubBody, '/game/hub must not be served from the poisoned cache').not.to.include('STALE_CACHED_SCREEN_MARKER')

      const marketBody = await win.fetch('/game/market').then(res => res.text())
      expect(marketBody, '/game/market must not be served from the poisoned cache').not.to.include('STALE_CACHED_SCREEN_MARKER')

      // A file extension in the path is what marks a real static asset
      // (public/game/assets/*, .scene.json files, etc.) — these should
      // still be served from cache without hitting the network.
      const staticUrl = `${win.location.origin}/game/assets/cache-test-marker.json`
      await cache.put(
        new win.Request(staticUrl),
        new win.Response('{"marker":"STALE_STATIC_MARKER"}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
      const staticBody = await win.fetch(staticUrl).then(res => res.text())
      expect(staticBody, 'real static /game/ assets should still be cache-first').to.include('STALE_STATIC_MARKER')
    })
  })
})
