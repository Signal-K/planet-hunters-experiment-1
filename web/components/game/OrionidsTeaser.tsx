'use client'

import { useEffect, useState } from 'react'
import { captureGameEvent } from '@/lib/posthog'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import {
  ORIONIDS_TEASER_SEEN_KEY,
  orionidsCountdown,
  orionidsDevForced,
  orionidsTeaserDayKey,
  orionidsTeaserDevForced,
  orionidsTeaserForcedInstant,
  shouldShowOrionidsTeaser,
  skyEventNow,
} from '@/lib/data/sky-events'
import { ORIONIDS_VARIANTS, orionidsVariantForSurface } from '@/lib/orionids/theme'
import styles from './OrionidsTeaser.module.css'

let openedThisSession = false
let dismissedThisSession = false
let reportedThisSession = false

function teaserClock(): { now: number; forced: boolean } {
  const dev = isDevLauncherEnabled()
  const forced = dev && orionidsTeaserDevForced()
  if (dev && orionidsDevForced()) return { now: skyEventNow(dev), forced: false }
  const now = forced ? orionidsTeaserForcedInstant() : skyEventNow(dev)
  return { now, forced: forced && !orionidsDevForced() }
}

function readSeenDay(): string | null {
  try {
    return window.localStorage.getItem(ORIONIDS_TEASER_SEEN_KEY)
  } catch {
    return null
  }
}

/**
 * Small coming-soon card on Base. At most once per local day until 19 Oct.
 * The meteor icon stands in for a coming-soon state; the active chip raster
 * says the shower is already on, so it stays off this card.
 */
export default function OrionidsTeaser() {
  const [open, setOpen] = useState(false)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0 })
  const icon = ORIONIDS_VARIANTS[orionidsVariantForSurface('base')].meteorIcon

  useEffect(() => {
    const sync = () => {
      const { now, forced } = teaserClock()
      if (isDevLauncherEnabled() && orionidsDevForced()) return
      if (dismissedThisSession) return
      if (openedThisSession) {
        setCountdown(orionidsCountdown(now))
        setOpen(true)
        return
      }
      if (!shouldShowOrionidsTeaser(now, readSeenDay(), forced)) return
      openedThisSession = true
      setCountdown(orionidsCountdown(now))
      setOpen(true)
      if (!forced) {
        try { window.localStorage.setItem(ORIONIDS_TEASER_SEEN_KEY, orionidsTeaserDayKey(now)) } catch { /* private mode */ }
      }
      if (!reportedThisSession) {
        reportedThisSession = true
        captureGameEvent('sky_event_teaser_seen', { event_id: 'orionids-2026' })
      }
    }
    sync()
    const id = window.setInterval(() => {
      if (!openedThisSession) return
      const { now } = teaserClock()
      setCountdown(orionidsCountdown(now))
    }, 60_000)
    return () => window.clearInterval(id)
  }, [])

  if (!open) return null
  const when = countdown.days > 0
    ? `${countdown.days} days ${countdown.hours} hours`
    : `${countdown.hours} hours`
  return (
    <aside className={styles.card} data-testid="orionids-teaser" aria-label="Orionids coming soon">
      <div className={styles.row}>
        <img className={styles.icon} src={icon} alt="" />
        <p className={styles.kicker}>Coming soon</p>
      </div>
      <p className={styles.copy}>Orionids and special missions are coming.</p>
      <p className={styles.count} data-testid="orionids-teaser-countdown">{when} to 19 Oct</p>
      <button type="button" className={styles.dismiss} data-testid="orionids-teaser-dismiss" onClick={() => { dismissedThisSession = true; setOpen(false) }}>
        Dismiss
      </button>
    </aside>
  )
}
