'use client'

// SSL-316: one drive control for every device. The field opens on the flat
// top-down map, where screen up/down/left/right are world tiles, so the pad
// is a plain cross. In the iso diorama the same four buttons drive along the
// screen diagonals the engine already uses (0 SE, 1 SW, 2 NW, 3 NE).
//
// The readout answers the two questions playtests kept asking: where is the
// rover going, and how do I stop it.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, Map as MapIcon, X } from 'lucide-react'
import type { ViewKind } from '@takeon/engine'
import type { TakeOnBlockedReason, TakeOnFieldOrder, TakeOnMountHandle, TakeOnRoverPose } from './TakeOnMount'
import styles from './RoverDrivePad.module.css'

const POLL_MS = 250

export type DriveDir = 0 | 1 | 2 | 3

export interface DriveButton {
  dir: DriveDir
  label: string
  /** Grid slot on the cross: up, left, right, down. */
  slot: 'up' | 'left' | 'right' | 'down'
}

/**
 * Screen-relative labels for the engine's four move directions. The flat
 * map reads as a compass rose; the diorama reads as diagonals so the button
 * matches the direction the rover visibly travels.
 */
export function driveButtons(view: ViewKind | null): DriveButton[] {
  if (view === 'iso') {
    return [
      { dir: 3, label: 'NE', slot: 'up' },
      { dir: 2, label: 'NW', slot: 'left' },
      { dir: 0, label: 'SE', slot: 'right' },
      { dir: 1, label: 'SW', slot: 'down' },
    ]
  }
  return [
    { dir: 3, label: 'UP', slot: 'up' },
    { dir: 2, label: 'LEFT', slot: 'left' },
    { dir: 0, label: 'RIGHT', slot: 'right' },
    { dir: 1, label: 'DOWN', slot: 'down' },
  ]
}

/** Why a press did nothing, in the player's words. */
const BLOCKED_COPY: Record<TakeOnBlockedReason, string> = {
  cliff: 'BLOCKED · TOO STEEP THAT WAY',
  edge: 'BLOCKED · EDGE OF THE FIELD',
  battery: 'BLOCKED · BATTERY EMPTY',
  busy: 'WAIT · ROVER IS BUSY',
}

/**
 * Human line for what the rover is doing right now. A blocked reason wins
 * (it is the answer to "why did nothing happen"), then any queued order,
 * then a manual step in progress, then where the rover is parked.
 */
export function driveStatus(
  order: TakeOnFieldOrder | null,
  routeSteps: number,
  rover: TakeOnRoverPose | null = null,
  blocked: TakeOnBlockedReason | null = null,
): string {
  if (blocked) return BLOCKED_COPY[blocked]
  if (order?.type === 'mine') return `DRIVING TO MINE · ${order.pos.x}, ${order.pos.y}`
  if (order) return `DRIVING TO ${order.pos.x}, ${order.pos.y} · ${routeSteps} STEPS LEFT`
  if (routeSteps > 0) return `${routeSteps} SAFE STEPS PLANNED`
  if (rover?.moving) return `MOVING · ${rover.x}, ${rover.y}`
  // Short enough to survive the 160px compact-landscape pad without
  // truncating the coordinates; the help line carries the "tap a tile" hint.
  if (rover) return `PARKED AT ${rover.x}, ${rover.y}`
  return 'IDLE · TAP A TILE OR USE THE PAD'
}

export function viewToggleLabel(view: ViewKind | null): string {
  return view === 'iso' ? 'MAP VIEW' : 'DIORAMA VIEW'
}

interface Snapshot {
  order: TakeOnFieldOrder | null
  routeSteps: number
  view: ViewKind | null
  rover: TakeOnRoverPose | null
}

const EMPTY: Snapshot = { order: null, routeSteps: 0, view: null, rover: null }

/** How long a refused press stays on the readout before the pose returns. */
const BLOCKED_MS = 1600

/**
 * A press the engine refused as `busy` is replayed the moment the rover is
 * free. Nothing replays while the pose is unknown or a step is still
 * animating, so the queued press never fires into another refusal.
 */
export function replayPending(pending: DriveDir | null, rover: TakeOnRoverPose | null): DriveDir | null {
  if (pending === null || !rover || rover.moving) return null
  return pending
}

function read(handle: RefObject<TakeOnMountHandle | null>): Snapshot {
  const h = handle.current
  if (!h) return EMPTY
  return { order: h.currentOrder(), routeSteps: h.plannedRouteLength(), view: h.view(), rover: h.rover() }
}

const ICONS = {
  flat: { up: ArrowUp, left: ArrowLeft, right: ArrowRight, down: ArrowDown },
  iso: { up: ArrowUpRight, left: ArrowUpLeft, right: ArrowDownRight, down: ArrowDownLeft },
} as const

export interface RoverDrivePadProps {
  handle: RefObject<TakeOnMountHandle | null>
  /** Compact placement (hides the helper line). */
  compact?: boolean
  /** Extra action rendered beside the view toggle, e.g. the BUILD switch. */
  trailing?: React.ReactNode
}

export default function RoverDrivePad({ handle, compact = false, trailing }: RoverDrivePadProps) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY)
  const [blocked, setBlocked] = useState<TakeOnBlockedReason | null>(null)
  // The engine refuses a press while the previous step is still animating.
  // Rather than drop it (which made the pad feel dead when tapped at a
  // natural rhythm), remember the last direction and replay it as soon as
  // the rover is free. One slot is enough: a newer press replaces it.
  const pendingDir = useRef<DriveDir | null>(null)
  const lastDir = useRef<DriveDir | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = read(handle)
      const dir = replayPending(pendingDir.current, next.rover)
      if (dir !== null) {
        pendingDir.current = null
        handle.current?.move(dir)
        setSnapshot(read(handle))
        return
      }
      setSnapshot(next)
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [handle])

  // The engine reports refused moves as events (the field may mount after
  // this pad does), so subscribe lazily once the handle exists.
  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    let clearTimer = 0
    const attach = window.setInterval(() => {
      if (!handle.current || unsubscribe) return
      unsubscribe = handle.current.onBlocked(reason => {
        // A tap while a step is still animating is not a refusal worth
        // shouting about: the readout already says MOVING. Queue it instead.
        if (reason === 'busy') {
          pendingDir.current = lastDir.current
          return
        }
        pendingDir.current = null
        setBlocked(reason)
        window.clearTimeout(clearTimer)
        clearTimer = window.setTimeout(() => setBlocked(null), BLOCKED_MS)
      })
    }, POLL_MS)
    return () => {
      window.clearInterval(attach)
      window.clearTimeout(clearTimer)
      unsubscribe?.()
    }
  }, [handle])

  const move = useCallback((dir: DriveDir) => {
    lastDir.current = dir
    if (handle.current?.move(dir)) {
      pendingDir.current = null
      setBlocked(null)
    }
    setSnapshot(read(handle))
  }, [handle])

  const stop = useCallback(() => {
    pendingDir.current = null
    handle.current?.cancelOrder()
    setSnapshot(read(handle))
  }, [handle])

  const icons = snapshot.view === 'iso' ? ICONS.iso : ICONS.flat
  const buttons = driveButtons(snapshot.view)
  const hasOrder = !!snapshot.order || snapshot.routeSteps > 0

  return (
    <div className={`${styles.pad} ${compact ? styles.compact : ''}`} data-testid="rover-drive-pad" data-view={snapshot.view ?? 'loading'}>
      <div className={styles.status} data-testid="rover-drive-status" aria-live="polite" data-blocked={blocked ?? undefined}>
        <span className={styles.eyebrow}>ROVER</span>
        <strong className={blocked ? styles.statusBlocked : undefined}>
          {driveStatus(snapshot.order, snapshot.routeSteps, snapshot.rover, blocked)}
        </strong>
      </div>

      <div className={styles.cross} role="group" aria-label="Drive the rover one tile">
        {buttons.map(button => {
          const Icon = icons[button.slot]
          return (
            <button
              key={button.dir}
              type="button"
              className={styles.dir}
              data-slot={button.slot}
              onClick={() => move(button.dir)}
              aria-label={`Drive ${button.label.toLowerCase()}`}
              data-testid={`rover-drive-${button.slot}`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{button.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={`${styles.dir} ${styles.stop}`}
          data-slot="centre"
          disabled={!hasOrder}
          onClick={stop}
          aria-label="Stop the rover"
          data-testid="rover-drive-stop"
        >
          <X size={18} aria-hidden="true" />
          <span>STOP</span>
        </button>
      </div>

      <div className={styles.row}>
        <button
          type="button"
          className={styles.action}
          onClick={() => { handle.current?.toggleView(); setSnapshot(read(handle)) }}
          data-testid="rover-drive-view"
        >
          <MapIcon size={14} aria-hidden="true" /> {viewToggleLabel(snapshot.view)}
        </button>
        {trailing}
      </div>

      {!compact && (
        <p className={styles.help}>
          Tap any tile to drive there along a safe route. Stop on an exposed deposit to drill it.
        </p>
      )}
    </div>
  )
}
