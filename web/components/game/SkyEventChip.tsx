'use client'

import { useEffect, useState } from 'react'
import { captureGameEvent } from '@/lib/posthog'
import { debrisNow, useDebrisEvent } from '@/lib/hooks/useDebrisEvent'
import { ORIONIDS_VARIANTS, orionidsVariantForSurface } from '@/lib/orionids/theme'
import { ORIONIDS_DEBRIS_PRESET, ORIONIDS_PANEL, WORLD_SPACE_WEEK_PLAYER_LINKS, isOrionidsPeakNight, isOrionidsWindow, orionidsShareText, type BadgeTier } from '@/lib/data/sky-events'
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
  onParticipate,
}: {
  surface: 'base' | 'mining'
  className?: string
  debrisCount?: number
  badgeTier?: BadgeTier | null
  onParticipate?: () => void
}) {
  const activePreset = useDebrisEvent()
  const [open, setOpen] = useState(false)
  const [inWindow, setInWindow] = useState(false)
  const [peak, setPeak] = useState(false)
  const [shared, setShared] = useState(false)
  useEffect(() => {
    const tick = () => { const now = debrisNow(); setInWindow(isOrionidsWindow(now)); setPeak(isOrionidsPeakNight(now)) }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])
  // SSL-578: Base keeps an Orionids entry all day in the window; debris itself waits for night.
  const daytimeEntry = !activePreset && inWindow && surface === 'base'
  const preset = activePreset ?? (daytimeEntry ? ORIONIDS_DEBRIS_PRESET : null)
  const [dotOn, setDotOn] = useState(true)
  const orionids = preset?.eventId === 'orionids-2026'
  const share = async () => {
    if (!badgeTier) return
    const text = orionidsShareText(badgeTier)
    captureGameEvent('sky_event_badge_shared', { event_id: 'orionids-2026', tier: badgeTier })
    try {
      if (typeof navigator.share === 'function') await navigator.share({ text })
      else await navigator.clipboard.writeText(text)
      setShared(true)
    } catch { /* cancelled */ }
  }
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
      {orionids && !daytimeEntry && (
        <img
          className={styles.sky}
          data-blend={variant.skyBlend}
          src={variant.sky}
          alt=""
          data-testid="orionids-sky"
        />
      )}
      <div className={[styles.hud, 'sky-event-wrap', className].filter(Boolean).join(' ')} data-testid={`sky-event-${surface}`}>
        {orionids && !daytimeEntry ? (
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
            {daytimeEntry ? 'Orionids tonight' : preset.chipLabel}
          </button>
        )}
        {open && orionids && (
          <section className={styles.panel} data-testid="orionids-panel" aria-label="Orionids event">
            <h2 className={styles.panelTitle}>{ORIONIDS_PANEL.title}</h2>
            <p>{ORIONIDS_PANEL.what}</p>
            <p><strong className={styles.label}>When</strong> {ORIONIDS_PANEL.when}</p>
            <p data-peak={peak ? 'on' : 'off'}><strong className={styles.label}>{peak ? 'Peak now' : 'Peak'}</strong> {ORIONIDS_PANEL.peak}</p>
            <ol className={styles.steps}>
              {ORIONIDS_PANEL.steps.map(step => <li key={step}>{step}</li>)}
            </ol>
            <p><strong className={styles.label}>Badge</strong> {badgeTier ? `You hold the ${badgeTier} Orionids badge.` : 'Mine your first debris to earn gold. After the shower it is silver.'}</p>
            {onParticipate && <button type="button" className={styles.participate} data-testid="sky-event-participate" onClick={onParticipate}>VIEW EVENT</button>}
            {badgeTier && (
              <button type="button" className={styles.fallback} data-testid="orionids-share" onClick={() => { void share() }}>
                {shared ? 'Copied' : 'Share badge'}
              </button>
            )}
          </section>
        )}
        {open && !orionids && preset && (
          <div className={styles.note} role="status">
            <p>{preset.label} falls while you mine tonight. Laser it after it lands, then sell it at the Market spot price. It does not count toward the mining order.</p>
            {onParticipate && <button type="button" className={styles.participate} data-testid="sky-event-participate" onClick={onParticipate}>VIEW EVENT</button>}
            {preset.eventId === 'draconids-2026' && (
              <nav className={styles.playerLinks} aria-label="Continue World Space Week in other games">
                {WORLD_SPACE_WEEK_PLAYER_LINKS.map(link => (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
                ))}
              </nav>
            )}
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
