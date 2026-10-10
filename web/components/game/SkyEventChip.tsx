'use client'

import { useEffect, useState } from 'react'
import { captureGameEvent } from '@/lib/posthog'
import { useDebrisEvent } from '@/lib/hooks/useDebrisEvent'
import { ORIONIDS_VARIANTS, orionidsVariantForSurface } from '@/lib/orionids/theme'
import type { BadgeTier } from '@/lib/data/sky-events'
import styles from './SkyEventChip.module.css'

const seenSurfaces = new Set<string>()

/**
 * Sky overlay plus the "Orionids active" chip on Base and the mining HUD.
 * Renders nothing outside an active shower. The chip art is 235×44 (15px type).
 */
export default function SkyEventChip({
  surface,
  className,
  debrisCount = 0,
  badgeTier = null,
}: {
  surface: 'base' | 'mining'
  className?: string
  debrisCount?: number
  badgeTier?: BadgeTier | null
}) {
  const preset = useDebrisEvent()
  const [open, setOpen] = useState(false)
  const [dotOn, setDotOn] = useState(true)
  const orionids = preset?.eventId === 'orionids-2026'
  const variant = ORIONIDS_VARIANTS[orionidsVariantForSurface(surface)]

  useEffect(() => {
    if (!preset) return
    const key = `${preset.eventId}:${surface}`
    if (seenSurfaces.has(key)) return
    seenSurfaces.add(key)
    captureGameEvent('sky_event_seen', { event_id: preset.eventId, surface })
  }, [preset, surface])

  useEffect(() => {
    if (!orionids) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setDotOn(on => !on), 600)
    return () => window.clearInterval(id)
  }, [orionids])

  if (!preset) return null
  return (
    <>
      {orionids && (
        <img
          className={styles.sky}
          data-blend={variant.skyBlend}
          src={variant.sky}
          alt=""
          data-testid="orionids-sky"
        />
      )}
      <div className={[styles.hud, 'sky-event-wrap', className].filter(Boolean).join(' ')} data-testid={`sky-event-${surface}`}>
        {orionids ? (
          <button
            type="button"
            className={styles.chip}
            data-testid="sky-event-chip"
            aria-expanded={open}
            aria-label="Orionids active. Debris falls while you mine tonight."
            onClick={() => setOpen(o => !o)}
          >
            <img src={dotOn ? variant.chipOn : variant.chipOff} alt="" width={235} height={44} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.fallback}
            data-testid="sky-event-chip"
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            {preset.chipLabel}
          </button>
        )}
        {open && (
          <div className={styles.note} role="status">
            {preset.label} falls while you mine tonight. Laser it after it lands, then sell it at the Market spot price. It does not count toward the mining order.
          </div>
        )}
        {orionids && debrisCount > 0 && (
          <div className={styles.tally} data-testid="orionid-debris-count">
            <img src={variant.iconResource} alt="" />
            <strong>Orionid debris {debrisCount}</strong>
          </div>
        )}
        {orionids && badgeTier && (
          <div className={styles.badge} data-testid="orionids-badge" data-tier={badgeTier} role="status">
            <img src={variant.badgeSmall} alt="" data-tier={badgeTier} />
            <strong>Orionids {badgeTier}</strong>
          </div>
        )}
      </div>
    </>
  )
}
