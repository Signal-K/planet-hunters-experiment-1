'use client'

import styles from './MiningControls.module.css'

type Dir = 'up' | 'down' | 'left' | 'right'

const PATH: Record<Dir, string> = {
  up: 'M6 14 L12 8 L18 14',
  down: 'M6 10 L12 16 L18 10',
  left: 'M14 6 L8 12 L14 18',
  right: 'M10 6 L16 12 L10 18',
}

function Arrow({ dir }: { dir: Dir }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATH[dir]} />
    </svg>
  )
}

/**
 * Mining steering pad, bottom-left (rover d-pad style). Up/down hold altitude, left/right steer the ship.
 * Keyboard W/S/arrows still work; this is the main touch control (SSL-536).
 */
export function MiningDPad({ disabled, onAltitude, onSpeed, obstacleAhead = false }: {
  disabled?: boolean
  onAltitude: (dir: -1 | 0 | 1) => void
  onSpeed: (dir: -1 | 0 | 1) => void
  obstacleAhead?: boolean
}) {
  const hold = (dir: Dir) => {
    const go = () => {
      if (disabled) return
      if (dir === 'up') onAltitude(-1)
      else if (dir === 'down') onAltitude(1)
      else onSpeed(dir === 'left' ? -1 : 1)
    }
    const stop = () => (dir === 'up' || dir === 'down' ? onAltitude(0) : onSpeed(0))
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture?.(e.pointerId); go() },
      onPointerUp: stop,
      onPointerCancel: stop,
      onLostPointerCapture: stop,
    }
  }
  const label: Record<Dir, string> = { up: 'Climb', down: 'Descend', left: 'Reverse', right: 'Forward' }
  return (
    <div className={styles.dpad} role="group" aria-label="Steer" data-testid="mining-dpad">
      {(['up', 'left', 'right', 'down'] as Dir[]).map(dir => (
        <button key={dir} type="button" disabled={disabled} className={`${styles.pad} ${styles[dir]} ${dir === 'up' && obstacleAhead ? styles.obstacleAhead : ''}`} data-testid={`mining-dpad-${dir}`} aria-label={dir === 'up' && obstacleAhead ? 'Climb, obstacle ahead' : label[dir]} {...hold(dir)}>
          <Arrow dir={dir} />
        </button>
      ))}
      <span className={styles.center} aria-hidden="true" />
    </div>
  )
}

/**
 * Mining FIRE button, bottom-right opposite the d-pad (SSL-708): one big round
 * action button, like a controller. The ring shows laser charge, so there is
 * no separate gauge overlay. Hold re-fires as soon as the laser is ready.
 */
export function MiningFireButton({ charges, max, charging, firing, disabled, onPress, onRelease, onKeyFire }: {
  charges: number
  max: number
  charging: boolean
  firing: boolean
  disabled?: boolean
  onPress: () => void
  onRelease: () => void
  onKeyFire: () => void
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, charges / max)) : 0
  const state = charges <= 0 ? 'empty' : pct <= 0.25 ? 'low' : 'ok'
  return (
    <button
      type="button"
      className={styles.fire}
      data-testid="fire-laser-btn"
      data-beacon="mining-fire-laser"
      data-state={state}
      data-charging={charging || undefined}
      data-firing={firing || undefined}
      disabled={disabled}
      aria-label={charges <= 0 ? 'Fire laser, depleted' : `Fire laser, ${charges} of ${max} charges`}
      style={{ ['--charge' as string]: `${pct * 360}deg` }}
      onPointerDown={e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture?.(e.pointerId); onPress() }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      onClick={e => { if (e.detail === 0) onKeyFire() }}
    >
      <span className={styles.fireRing} aria-hidden="true" />
      <span className={styles.fireFace}>
        <span className={styles.fireLabel}>{charges <= 0 ? 'Empty' : 'Fire'}</span>
        <span className={styles.fireCount}>{charges}</span>
      </span>
    </button>
  )
}

/** The one control at the top of the mining scene: opens the mission menu (SSL-708). */
export function MiningBackButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" className={styles.back} data-testid="mining-back-btn" aria-label="Mission menu" aria-expanded={open} onClick={onClick}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5 L8 12 L15 19" />
      </svg>
      <span>Menu</span>
    </button>
  )
}
