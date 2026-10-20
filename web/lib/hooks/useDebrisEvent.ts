'use client'

import { useEffect, useState } from 'react'
import { activeDebrisPreset, orionidsDevForced, orionidsForcedInstant, skyEventNow, type DebrisEventPreset } from '@/lib/data/sky-events'
import { isDevLauncherEnabled } from '@/lib/devAccess'

/**
 * Current debris-event clock. Dev/staging honours window.__LANDNAM_DEV_NOW,
 * and the Orionids force switch pins the clock to peak night so the shower,
 * the night gate, and a gold badge all line up.
 */
export function debrisNow(): number {
  const dev = isDevLauncherEnabled()
  if (dev && orionidsDevForced()) return orionidsForcedInstant()
  return skyEventNow(dev)
}

/** The active debris preset, re-checked every minute. Orionids is live all day in its window. */
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
