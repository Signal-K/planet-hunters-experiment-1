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

/** Laser capacity: live drain per shot, recharge sweep while cooling, brick-red warning when low. */
export function LaserGauge({ charges, max, charging, firing }: { charges: number; max: number; charging: boolean; firing: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, charges / max)) : 0
  const low = pct <= 0.25
  const state = charges <= 0 ? 'empty' : low ? 'low' : 'ok'
  return (
    <div className={styles.gauge} data-testid="laser-gauge" data-state={state} data-firing={firing || undefined} role="meter" aria-label="Laser capacity" aria-valuemin={0} aria-valuemax={max} aria-valuenow={charges}>
      <div className={styles.gaugeHead}>
        <span className={styles.gaugeLabel}>Laser</span>
        <span className={styles.gaugeValue}>{charges}/{max}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct * 100}%` }} />
        {charging ? <div className={styles.recharge} /> : null}
      </div>
      {state !== 'ok' ? <span className={styles.warn}>{state === 'empty' ? 'Depleted' : 'Low charge'}</span> : null}
    </div>
  )
}
