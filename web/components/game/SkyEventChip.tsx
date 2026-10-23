'use client'

import { useEffect, useState } from 'react'
import { captureGameEvent } from '@/lib/posthog'
import { debrisNow, useDebrisEvent } from '@/lib/hooks/useDebrisEvent'
import { ORIONIDS_VARIANTS, orionidsVariantForSurface } from '@/lib/orionids/theme'
import { ORIONIDS_DEBRIS_PRESET, ORIONIDS_PANEL, WORLD_SPACE_WEEK_PLAYER_LINKS, isOrionidsWindow, orionidsShareText, type BadgeTier } from '@/lib/data/sky-events'
import { formatViewingWindow, isInLocalEventBonusWindow, localSkyEventWindow, ORIONIDS_EPHEMERIS } from '@/lib/data/sky-event-window'
import type { PlayerLocation } from '@/lib/game-types'
import { openOrionidsReading } from '@/lib/orionids/reading'
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
  fragmentGoal,
  badgeTier = null,
  onParticipate,
  playerLocation,
}: {
  surface: 'base' | 'mining'
  className?: string
  debrisCount?: number
  fragmentGoal?: number
  badgeTier?: BadgeTier | null
  onParticipate?: () => void
  playerLocation?: PlayerLocation | null
}) {
  const activePreset = useDebrisEvent()
  const [open, setOpen] = useState(false)
  const [inWindow, setInWindow] = useState(false)
  const [peak, setPeak] = useState(false)
  const [shared, setShared] = useState(false)
  useEffect(() => {
    const tick = () => { const now = debrisNow(); setInWindow(isOrionidsWindow(now)); setPeak(isInLocalEventBonusWindow(now, playerLocation)) }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [playerLocation])
  // SSL-578: the shower is live every hour in the window. Launch catches the fragments.
  const daytimeEntry = !activePreset && inWindow && surface === 'base'
  const preset = activePreset ?? (daytimeEntry ? ORIONIDS_DEBRIS_PRESET : null)
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
  const localWindow = localSkyEventWindow(ORIONIDS_EPHEMERIS, playerLocation)

  useEffect(() => {
    if (!preset) return
    const key = `${preset.eventId}:${surface}`
    if (seenSurfaces.has(key)) return
    seenSurfaces.add(key)
    captureGameEvent('sky_event_seen', { event_id: preset.eventId, surface })
  }, [preset, surface])

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
        {(!open || !orionids) && (orionids && surface === 'base' ? (
          <button
            type="button"
            className={styles.eventButton}
            data-testid="sky-event-chip"
            aria-expanded={open}
            aria-label={peak ? 'Orionids peak times two. Open event details.' : 'Orionids live. Open event details.'}
            onClick={() => setOpen(o => !o)}
          >
            <img src={variant.meteorIcon} alt="" />
            <span>Orionids</span>
            <small>{peak ? 'PEAK x2' : 'LIVE'}</small>
          </button>
        ) : orionids ? (
          <button
            type="button"
            className={styles.chip}
            data-testid="sky-event-chip"
            aria-expanded={open}
            aria-label="Orionids active. Fragments are caught on the way up."
            onClick={() => setOpen(o => !o)}
          >
            <img src={variant.chipOn} alt="" width={235} height={44} />
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
        ))}
        {open && orionids && (
          <section className={styles.panel} data-testid="orionids-panel" aria-label="Orionids event">
            <div className={styles.panelHeading}>
              <h2 className={styles.panelTitle}>{ORIONIDS_PANEL.title}</h2>
              <span>{peak ? 'PEAK x2' : 'LIVE'}</span>
              <button type="button" className={styles.panelClose} aria-label="Close Orionids details" onClick={() => setOpen(false)}>Close</button>
            </div>
            <p className={styles.summary}>Launch through the shower. Fragments are caught on the way up, any hour. Peak night is double.</p>
            <div className={styles.meta} aria-label="Orionids dates">
              <span>19 Oct–7 Nov</span>
              <span data-testid="orionids-local-window">{localWindow.location.city ?? localWindow.location.timeZone} · {formatViewingWindow(localWindow.best, localWindow.location.timeZone)}</span>
            </div>
            <p className={styles.reward}>{badgeTier ? `${badgeTier} badge earned` : 'First debris earns Gold · Silver replay later'}</p>
            {badgeTier && (
              <p className={styles.summary} data-testid="orionids-return-hook">
                {peak ? 'Peak night is on: every fragment counts double. Launch again.' : 'The shower runs to 7 Nov. Launch again to catch more, peak night 21–22 Oct pays double.'}
              </p>
            )}
            <div className={styles.actions}>
              {onParticipate && <button type="button" className={styles.participate} data-testid="sky-event-participate" onClick={onParticipate}>VIEW EVENT</button>}
              {surface === 'base' && <button type="button" className={styles.secondary} data-testid="orionids-read-sky" onClick={() => openOrionidsReading(onParticipate)}>READ THE SKY</button>}
            </div>
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
        {orionids && fragmentGoal != null && (
          <div className={styles.tally} data-testid="orionids-fragment-counter">
            <img src={variant.iconResource} alt="" />
            <strong>Catch {fragmentGoal} Orionid fragments</strong>
            <span>{Math.min(debrisCount, fragmentGoal)} / {fragmentGoal}</span>
          </div>
        )}
        {orionids && peak && surface === 'mining' && (
          <div className={styles.peakTag} data-testid="orionids-peak-tag">PEAK x2</div>
        )}
        {orionids && debrisCount > 0 && fragmentGoal == null && (
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
