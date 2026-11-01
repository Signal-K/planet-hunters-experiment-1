'use client'

import type { ReactNode } from 'react'
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
export function MiningDPad({ disabled, onAltitude, onSpeed, obstacleAhead = false, labels }: {
  disabled?: boolean
  onAltitude: (dir: -1 | 0 | 1) => void
  onSpeed: (dir: -1 | 0 | 1) => void
  obstacleAhead?: boolean
  /** Button names for a scene that steers something else (the rover drives north/east/south/west). */
  labels?: Partial<Record<Dir, string>>
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
  const label: Record<Dir, string> = { up: 'Climb', down: 'Descend', left: 'Reverse', right: 'Forward', ...labels }
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
export function MiningFireButton({ charges, max, charging, firing, ready = false, disabled, onPress, onRelease, onKeyFire, label = 'Fire', countText, ariaLabel, testId = 'fire-laser-btn' }: {
  charges: number
  max: number
  charging: boolean
  firing: boolean
  /** SSL-710: a shot fired now would hit a seam. */
  ready?: boolean
  disabled?: boolean
  onPress: () => void
  onRelease: () => void
  onKeyFire: () => void
  /** The rover reuses this button as DRILL with its battery on the ring (same controls in every mining scene). */
  label?: string
  countText?: string
  ariaLabel?: string
  testId?: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, charges / max)) : 0
  const state = charges <= 0 ? 'empty' : pct <= 0.25 ? 'low' : 'ok'
  return (
    <button
      type="button"
      className={styles.fire}
      data-testid={testId}
      data-beacon="mining-fire-laser"
      data-state={state}
      data-charging={charging || undefined}
      data-firing={firing || undefined}
      data-ready={(ready && charges > 0) || undefined}
      disabled={disabled}
      aria-label={ariaLabel ?? (charges <= 0 ? 'Fire laser, depleted' : `Fire laser, ${charges} of ${max} charges`)}
      style={{ ['--charge' as string]: `${pct * 360}deg` }}
      onPointerDown={e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture?.(e.pointerId); onPress() }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      onClick={e => { if (e.detail === 0) onKeyFire() }}
    >
      <span className={styles.fireRing} aria-hidden="true" />
      <span className={styles.fireFace}>
        <span className={styles.fireLabel}>{charges <= 0 ? 'Empty' : label}</span>
        <span className={styles.fireCount}>{countText ?? charges}</span>
      </span>
    </button>
  )
}

/** Icon per second-action kind (lib/mining/secondaryAction.ts). */
const ACTION_ICONS: Record<string, ReactNode> = {
  catch: (
    <>
      <path d="M5 4 L9 15 H15 L19 4" />
      <path d="M9 19 H15" />
    </>
  ),
  scan: (
    <>
      <path d="M4 12 A8 8 0 0 1 20 12" />
      <path d="M8 12 A4 4 0 0 1 16 12" />
      <path d="M12 12 L12 19" />
    </>
  ),
}

/**
 * SSL-711: the mining run's second action button, up and to the left of FIRE,
 * like a second face button. Any run that declares a second action in
 * lib/mining/secondaryAction.ts gets it; `ready` lights it when pressing now
 * would work.
 */
export function MiningActionButton({ action, label, keyLabel, ready, pressed, disabled, onPress, testId = 'mining-action-btn' }: {
  action: string
  label: string
  keyLabel?: string
  ready: boolean
  pressed: boolean
  disabled?: boolean
  onPress: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      className={styles.action}
      data-testid={testId}
      data-action={action}
      data-ready={ready || undefined}
      data-pressed={pressed || undefined}
      disabled={disabled}
      aria-label={ready ? `${label}, ready` : label}
      aria-keyshortcuts={keyLabel}
      onPointerDown={e => { if (e.button !== 0) return; onPress() }}
      onClick={e => { if (e.detail === 0) onPress() }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ACTION_ICONS[action] ?? <circle cx="12" cy="12" r="6" />}
      </svg>
      <span>{label}</span>
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

/** Pixel icon for a How to play card in the mining menu (laser and rover share it). */
export function MiningGuideMark({ kind }: { kind: string }) {
  const blocks: Record<string, Array<[number, number, number, number]>> = {
    fire: [[6, 0, 2, 4], [8, 2, 2, 2], [10, 3, 2, 3], [8, 5, 2, 2], [6, 6, 2, 2], [4, 7, 2, 3], [6, 9, 2, 5], [4, 13, 2, 2]],
    charges: [[7, 1, 2, 2], [4, 3, 8, 1], [4, 3, 1, 11], [11, 3, 1, 11], [4, 13, 8, 1], [6, 8, 4, 4]],
    order: [[2, 3, 12, 2], [2, 7, 12, 2], [2, 11, 8, 2]],
    scroll: [[1, 7, 2, 2], [3, 5, 2, 2], [3, 9, 2, 2], [5, 3, 2, 2], [5, 11, 2, 2], [9, 3, 2, 2], [9, 11, 2, 2], [11, 5, 2, 2], [11, 9, 2, 2], [13, 7, 2, 2]],
    inventory: [[3, 4, 10, 1], [3, 4, 1, 9], [12, 4, 1, 9], [3, 12, 10, 1], [5, 7, 6, 1], [7, 7, 2, 4]],
    deliver: [[2, 4, 8, 1], [2, 4, 1, 8], [9, 4, 1, 8], [2, 11, 8, 1], [12, 6, 2, 2], [11, 4, 2, 2], [11, 8, 2, 2]],
    return: [[7, 1, 2, 2], [5, 3, 6, 2], [3, 5, 10, 2], [4, 7, 8, 7], [7, 10, 2, 4]],
    scan: [[2, 6, 2, 2], [4, 4, 2, 2], [6, 3, 4, 1], [10, 4, 2, 2], [12, 6, 2, 2], [5, 8, 6, 1], [7, 7, 2, 7]],
  }
  return (
    <svg className="mining-guide-mark" viewBox="0 0 16 16" width="32" height="32" aria-hidden="true">
      {(blocks[kind] ?? blocks.fire).map(([x, y, w, h], index) => (
        <rect key={index} x={x} y={y} width={w} height={h} />
      ))}
    </svg>
  )
}
