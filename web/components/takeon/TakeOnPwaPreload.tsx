'use client'

import { useEffect } from 'react'

function isInstalledPwa(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches
    || navigatorWithStandalone.standalone === true
}

function scheduleIdle(work: () => void): () => void {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(work, { timeout: 5000 })
    return () => idleWindow.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(work, 1500)
  return () => window.clearTimeout(id)
}

/**
 * Warms TakeOn only for an installed, service-worker-controlled Landnam PWA.
 *
 * The actual mission mount still imports these modules lazily, so ordinary web
 * visits carry no PixiJS/TakeOn runtime cost. Once installed, loading them at
 * idle lets Landnam's service worker retain the hashed chunks before a player
 * loses connectivity.
 */
export default function TakeOnPwaPreload() {
  useEffect(() => {
    if (!isInstalledPwa() || !navigator.serviceWorker?.controller) return

    let cancelled = false
    const existingResources = new Set(
      performance.getEntriesByType('resource').map(entry => entry.name)
    )
    const cancelIdle = scheduleIdle(() => {
      void Promise.all([
        import('@takeon/engine'),
        import('@takeon/pixi'),
        import('pixi.js'),
      ]).then(() => {
        if (cancelled) return
        const urls = performance
          .getEntriesByType('resource')
          .map(entry => entry.name)
          .filter(url => !existingResources.has(url))
          .filter(url => {
            const parsed = new URL(url)
            return parsed.origin === window.location.origin
              && parsed.pathname.startsWith('/_next/static/')
          })
        navigator.serviceWorker.controller?.postMessage({ type: 'CACHE_URLS', urls })
      }).catch(() => {
        // The mission remains optional. A later online visit can still load it.
      })
    })

    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [])

  return null
}
