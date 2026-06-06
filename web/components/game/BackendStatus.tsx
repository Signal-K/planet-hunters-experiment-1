'use client'

import { useEffect, useState } from 'react'

type Health = 'checking' | 'online' | 'offline'

export default function BackendStatus() {
  const [health, setHealth] = useState<Health>('checking')

  useEffect(() => {
    let active = true
    fetch('/api/backend-health')
      .then(response => {
        if (active) setHealth(response.ok ? 'online' : 'offline')
      })
      .catch(() => {
        if (active) setHealth('offline')
      })
    return () => { active = false }
  }, [])

  return (
    <div className={`backend-status backend-status--${health}`} title="PocketBase backend status">
      <span aria-hidden="true" />
      DATA LINK · {health}
    </div>
  )
}
