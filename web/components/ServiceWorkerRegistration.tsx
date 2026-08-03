'use client'

import { useEffect } from 'react'

/**
 * Keep installed clients on the deployed build. The worker uses
 * skipWaiting/clients.claim, so controllerchange is the point at which a
 * one-time reload can safely move an already-open tab onto the new shell.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return

    let reloading = false
    const reloadForNewWorker = () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', reloadForNewWorker)
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(() => {
        // Service-worker support is progressive enhancement; the network app
        // remains usable when registration is blocked or unavailable.
      })

    return () => navigator.serviceWorker.removeEventListener('controllerchange', reloadForNewWorker)
  }, [])

  return null
}
