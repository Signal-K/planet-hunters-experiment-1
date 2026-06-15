'use client'

import { useEffect, useRef, useState } from 'react'

type Health = 'checking' | 'warming' | 'online' | 'offline'

// After this many ms of failed checks, shift label to "WARMING UP" so the
// player understands the backend is cold-starting rather than broken.
const WARMING_THRESHOLD_MS = 3000

export default function BackendStatus() {
  const [health, setHealth] = useState<Health>('checking')
  const startedAt = useRef(Date.now())
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch('/api/backend-health', { cache: 'no-store' })
        if (cancelled) return
        if (res.ok) {
          setHealth('online')
          return // backend is warm — stop polling
        }
      } catch {
        if (cancelled) return
      }

      const elapsed = Date.now() - startedAt.current
      setHealth(elapsed >= WARMING_THRESHOLD_MS ? 'warming' : 'checking')
      retryTimer.current = setTimeout(check, 2000)
    }

    check()
    return () => {
      cancelled = true
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [])

  if (health === 'online') return null

  const label =
    health === 'warming' ? 'WARMING UP' :
    health === 'offline' ? 'OFFLINE' :
                           'CONNECTING'

  return (
    <div className={`backend-status backend-status--${health}`} title="PocketBase backend status">
      <span aria-hidden="true" />
      DATA LINK · {label}
    </div>
  )
}
