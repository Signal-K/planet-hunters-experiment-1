'use client'

import { useEffect } from 'react'

/**
 * Last-resort recovery screen. A render or chunk-load failure (for example an
 * offline visit to a page whose scripts were never cached) must not leave the
 * installed PWA on a blank screen it cannot leave. "Reload" retries; "Reset
 * offline data" drops the service worker and its caches so the next launch
 * fetches a clean shell. Saved game state lives in app storage, not the cache.
 */
export default function AppErrorRecovery({ error, reset }: { error: Error; reset?: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const resetOffline = async () => {
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations?.()
      await Promise.all((registrations ?? []).map(r => r.unregister()))
      const keys = await caches.keys()
      await Promise.all(keys.filter(k => k.startsWith('landnam-shell-')).map(k => caches.delete(k)))
    } catch {
      // Best effort: reload regardless.
    }
    window.location.href = '/game'
  }

  const button = {
    minHeight: 44,
    padding: '10px 24px',
    background: 'transparent',
    border: '1px solid rgba(0, 229, 255, 0.35)',
    borderRadius: 4,
    color: '#00e5ff',
    fontSize: 14,
    letterSpacing: '0.1em',
    cursor: 'pointer',
  } as const

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#070b12', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#fff',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 320, textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, letterSpacing: '0.12em', color: '#00e5ff', margin: 0 }}>SIGNAL LOST</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
          This screen could not load. Your progress is saved on this device.
        </p>
        <button style={button} onClick={() => (reset ? reset() : window.location.reload())}>TRY AGAIN</button>
        <button style={button} onClick={() => window.location.reload()}>RELOAD</button>
        <button style={button} onClick={resetOffline}>RESET OFFLINE DATA</button>
      </div>
    </div>
  )
}
