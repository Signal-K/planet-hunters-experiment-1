'use client'

import { useEffect, useState } from 'react'
import { activeDebrisPreset, skyEventNow, type DebrisEventPreset } from '@/lib/data/sky-events'
import { isDevLauncherEnabled } from '@/lib/devAccess'

/** Current debris-event clock; honours window.__LANDNAM_DEV_NOW in dev/staging only. */
export function debrisNow(): number {
  return skyEventNow(isDevLauncherEnabled())
}

/** The active debris preset (window + local night), re-checked every minute. Null otherwise. */
export function useDebrisEvent(): DebrisEventPreset | null {
  const [preset, setPreset] = useState<DebrisEventPreset | null>(null)
  useEffect(() => {
    const tick = () => setPreset(prev => {
      const next = activeDebrisPreset(debrisNow())
      return next?.eventId === prev?.eventId ? prev : next
    })
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])
  return preset
}
