'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  MissionState,
  ResourceKey,
  RoverGame,
  RoverSpec,
  StructureType,
  SyncAdapter,
  ViewKind,
} from '@takeon/engine'
import type { LifeStage, SurfaceTarget } from '@/lib/data'
import { LandnamSync } from '@/lib/takeon/LandnamSync'
import { buildLandnamBody, registerLandnamSandbox } from '@/lib/takeon/sandbox'
import {
  bindTakeonHostEvents,
  notificationForTakeonEvent,
  type TakeonHostEvent,
} from '@/lib/takeon/events'
import { scheduleLandnamPush } from '@/lib/takeon/push'
import styles from './TakeOnMount.module.css'

export interface TakeOnFieldOrder {
  type: 'goto' | 'mine'
  pos: { x: number; y: number }
}

export interface TakeOnMountHandle {
  /** Deposit all rover cargo into an adjacent cache. Returns units moved. */
  deposit: () => number
  /** Place a structure on the tile the rover faces. False when the engine refuses (a `buildFailed` event follows). */
  build: (type: StructureType) => boolean
  demolish: (structureId: string) => boolean
  rotateStructure: (structureId: string) => boolean
  /** The structure on the tile the rover currently faces, if any. */
  facedStructure: () => { id: string; type: StructureType } | null
  currentOrder: () => TakeOnFieldOrder | null
  cancelOrder: () => void
  plannedRouteLength: () => number
  view: () => ViewKind | null
  toggleView: () => ViewKind | null
  rotateView: () => void
  /** Structures currently placed on the field (read-only snapshot for sharing). */
  structures: () => { id: string; type: StructureType; x: number; y: number; facing: number }[]
}

export interface TakeOnMountProps {
  missionId: string
  bodyId: string
  rover: RoverSpec
  roverName?: string
  seed?: number
  adapter?: SyncAdapter
  className?: string
  /**
   * Cargo to place directly in the rover's hold once the mission mounts, for
   * scenes that visualise cargo the host already tracks (e.g. a tutorial
   * dropoff) rather than cargo mined live in Takeon. Applied once, on mount.
   */
  seedCargo?: Partial<Record<ResourceKey, number>>
  /**
   * Place one `cache` structure adjacent to the rover's spawn tile once the
   * mission mounts, so a seeded-cargo scene always has somewhere to deposit.
   * Ignored on a resumed mission (structures already exist).
   */
  seedCache?: boolean
  /**
   * Landnam target this field belongs to. When supplied, the takeon body is
   * rebuilt with Landnam biomes gated by the target's habitability and
   * `lifeStage` (SSL-317); otherwise the stock takeon body is mounted.
   */
  target?: SurfaceTarget
  lifeStage?: LifeStage
  /** Read-only visit: pointer input is disabled and no save is written. */
  readOnly?: boolean
  onEvent?: (event: TakeonHostEvent) => void
  /** Host-facing route state for the safe tap-to-drive planner. */
  onRouteChange?: (steps: number) => void
  onReady?: (mission: MissionState) => void
  onError?: (error: Error) => void
}

/**
 * TakeOn's controls receive pointer coordinates in CSS pixels. Pixi's
 * `canvas.width` is the backing-buffer width (and can be multiplied by the
 * device-pixel ratio), so using it as the game viewport makes the planner's
 * hit tiles drift away from the rendered rover field (KES-323).
 */
export function takeOnViewportSize(canvas: Pick<HTMLCanvasElement, 'clientWidth' | 'clientHeight'>): { width: number; height: number } {
  return {
    width: Math.max(1, canvas.clientWidth || 800),
    height: Math.max(1, canvas.clientHeight || 600),
  }
}

/** Tile in front of the rover. Facing follows takeon's iso convention: 0 SE, 1 SW, 2 NW, 3 NE. */
export function facedTile(pos: { x: number; y: number }, facing: 0 | 1 | 2 | 3): { x: number; y: number } {
  const delta = [[1, 0], [0, 1], [-1, 0], [0, -1]][facing] ?? [1, 0]
  return { x: pos.x + delta[0], y: pos.y + delta[1] }
}

const TakeOnMount = forwardRef<TakeOnMountHandle, TakeOnMountProps>(function TakeOnMount({
  missionId,
  bodyId,
  rover,
  roverName = rover.name,
  seed,
  adapter: suppliedAdapter,
  className,
  seedCargo,
  seedCache,
  target,
  lifeStage = 'dormant',
  readOnly = false,
  onEvent,
  onRouteChange,
  onReady,
  onError,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<RoverGame | null>(null)
  const adapter = useMemo(
    () => suppliedAdapter ?? new LandnamSync(),
    [suppliedAdapter]
  )
  const [error, setError] = useState<string | null>(null)

  // Seeding is applied once, on mount — read via refs so changing identity
  // on every render (an unmemoized object/array from the caller) can never
  // retrigger the expensive mount effect below.
  const seedCargoRef = useRef(seedCargo)
  seedCargoRef.current = seedCargo
  const seedCacheRef = useRef(seedCache)
  seedCacheRef.current = seedCache

  // Only the target identity matters for the mount; a fresh object with the
  // same id must not remount the field.
  const targetId = target?.id
  const targetRef = useRef(target)
  targetRef.current = target

  useImperativeHandle(ref, () => ({
    deposit: () => gameRef.current?.deposit() ?? 0,
    build: type => gameRef.current?.build(type) ?? false,
    demolish: id => gameRef.current?.demolish(id) ?? false,
    rotateStructure: id => gameRef.current?.rotateStructure(id) ?? false,
    facedStructure: () => {
      const game = gameRef.current
      if (!game) return null
      const { pos, facing } = game.sim.rover
      const faced = facedTile(pos, facing)
      const structure = game.sim.structures.find(s => s.pos.x === faced.x && s.pos.y === faced.y)
      return structure ? { id: structure.id, type: structure.type } : null
    },
    currentOrder: () => {
      const order = gameRef.current?.currentOrder()
      return order ? { type: order.type, pos: { x: order.pos.x, y: order.pos.y } } : null
    },
    cancelOrder: () => gameRef.current?.cancelOrder(),
    plannedRouteLength: () => gameRef.current?.plannedRoute().length ?? 0,
    view: () => gameRef.current?.view ?? null,
    toggleView: () => gameRef.current?.toggleView() ?? null,
    rotateView: () => gameRef.current?.rotateView(),
    structures: () => (gameRef.current?.sim.structures ?? []).map(s => ({
      id: s.id, type: s.type, x: s.pos.x, y: s.pos.y, facing: s.facing ?? 0,
    })),
  }), [])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvasElement: HTMLCanvasElement = canvasRef.current

    let app: import('pixi.js').Application | null = null
    let mounted: import('@takeon/pixi').MountedRoverGame | null = null
    let resizeObserver: ResizeObserver | null = null
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let unbindHostEvents: (() => void) | null = null
    let unbindStateChanged: (() => void) | null = null
    let unbindRoutePointer: (() => void) | null = null
    let unbindPhoto: (() => void) | null = null
    let unbindDiscovery: (() => void) | null = null
    let disposed = false

    // The TakeOn adapter has its own fixed-step loop and a Pixi texture
    // presentation callback. Keep both detached while the installed PWA is
    // backgrounded; Landnam owns resuming the same mission when it returns.
    const syncVisibility = () => {
      if (!mounted) return
      if (document.hidden) mounted.pause()
      else mounted.resume()
    }

    const snapshot = (): MissionState | null => {
      if (!mounted) return null
      return {
        ...mounted.game.save(),
        id: missionId,
        bodyId,
      }
    }

    const save = async () => {
      if (readOnly) return
      const state = snapshot()
      if (state) await adapter.saveMission(state, roverName)
    }

    const reportError = (reason: unknown) => {
      const nextError = reason instanceof Error ? reason : new Error(String(reason))
      if (!disposed) setError(nextError.message)
      onError?.(nextError)
    }

    async function init() {
      try {
        const PIXI = await import('pixi.js')
        const { mountRoverGame } = await import('@takeon/pixi')
        const engine = await import('@takeon/engine')
        // Landnam's structures (roads, factories, silos…) and its biome
        // palette must exist before a saved mission referencing them resumes.
        registerLandnamSandbox(engine)
        const currentTarget = targetRef.current
        const body = currentTarget
          ? buildLandnamBody(engine, bodyId, currentTarget, lifeStage)
          : engine.getBody(bodyId)
        if (!body) throw new Error(`Unknown Takeon body: ${bodyId}`)

        // Seeded scenes (a tutorial dropoff, etc.) are ephemeral flavor —
        // Landnam owns the persisted delivery state, not Takeon — so they
        // always start fresh rather than resuming a prior save under the
        // same missionId.
        const isSeeded = !!(seedCargoRef.current || seedCacheRef.current)
        const resume = isSeeded ? null : await adapter.loadMission(missionId)
        if (disposed) return

        const viewport = takeOnViewportSize(canvasElement)
        app = new PIXI.Application()
        await app.init({
          canvas: canvasElement,
          width: viewport.width,
          height: viewport.height,
          backgroundAlpha: 0,
          antialias: true,
        })
        if (disposed) {
          app.destroy()
          app = null
          return
        }

        mounted = mountRoverGame({
          pixi: PIXI as unknown as import('@takeon/pixi').PixiNamespaceLike,
          stage: app.stage as unknown as import('@takeon/pixi').PixiContainerLike,
          ticker: app.ticker as unknown as import('@takeon/pixi').PixiTickerLike,
          view: app.canvas,
          // Keep the engine and Controls in CSS-pixel coordinates. The Pixi
          // backing buffer may be larger on a retina display.
          width: viewport.width,
          height: viewport.height,
          body,
          spec: rover,
          seed,
          resume: resume ?? undefined,
        })

        const handleHostEvent = (event: TakeonHostEvent) => {
          onEvent?.(event)
          const notification = notificationForTakeonEvent(event)
          if (notification) void scheduleLandnamPush(notification).catch(reportError)
        }
        unbindHostEvents = bindTakeonHostEvents(mounted.game.events, handleHostEvent)
        unbindStateChanged = mounted.game.events.on('stateChanged', () => {
          onRouteChange?.(mounted?.game.plannedRoute().length ?? 0)
          if (saveTimer) clearTimeout(saveTimer)
          saveTimer = setTimeout(() => void save().catch(reportError), 750)
        })
        // The vendored Pixi adapter owns the canvas Controls and handles a
        // tap-to-drive by calling game.walkTo() directly. That operation is a
        // route command, not a simulation state change, so no stateChanged
        // event is emitted for Landnam's route readout. Observe the completed
        // pointer gesture after Controls has handled it and publish the
        // authoritative planned-route length to the host (KES-323).
        const reportPointerRoute = () => {
          onRouteChange?.(mounted?.game.plannedRoute().length ?? 0)
        }
        canvasElement.addEventListener('pointerup', reportPointerRoute)
        unbindRoutePointer = () => canvasElement.removeEventListener('pointerup', reportPointerRoute)
        unbindPhoto = mounted.game.events.on('photo', ({ photo, dataUrl }) => {
          void adapter.uploadPhoto(photo, dataUrl, missionId).catch(reportError)
        })
        unbindDiscovery = mounted.game.events.on(
          'anomalyDocumented',
          ({ anomaly }) => {
            void adapter.recordDiscovery(anomaly, bodyId, missionId).catch(reportError)
          }
        )

        resizeObserver = new ResizeObserver(entries => {
          const entry = entries[0]
          if (!entry || !mounted) return
          mounted.resize(entry.contentRect.width, entry.contentRect.height)
        })
        resizeObserver.observe(canvasElement)

        mounted.start()
        gameRef.current = mounted.game
        document.addEventListener('visibilitychange', syncVisibility)
        // Don't call syncVisibility() here: document.hidden can read true on
        // a fully visible tab right at mount (occluded-but-onscreen windows,
        // some automation/test harnesses), and pausing immediately after
        // start() stops the render loop before a single frame paints —
        // leaving a blank canvas with no error (KES-308). The event listener
        // above still pauses/resumes on genuine visibility changes.

        const initialSeedCargo = seedCargoRef.current
        const initialSeedCache = seedCacheRef.current
        if (isSeeded) {
          const sim = mounted.game.sim
          if (initialSeedCache) {
            const { x, y } = sim.rover.pos
            sim.structures.push({
              id: `seed-cache-${missionId}`,
              type: 'cache',
              pos: { x: x + 1, y },
              buffer: {},
            })
          }
          if (initialSeedCargo) {
            let cargoUsed = 0
            for (const [resource, amount] of Object.entries(initialSeedCargo)) {
              if (!amount) continue
              sim.rover.cargo[resource as ResourceKey] = amount
              cargoUsed += amount
            }
            sim.rover.cargoUsed = cargoUsed
          }
          // Persist the authored unload point as part of the saved TakeOn
          // environment, rather than leaving it as a screen-only overlay.
          // Readiness is local-first: a review harness and an offline player
          // must be able to use the mounted scene without waiting for a
          // PocketBase round trip (KES-235).
          void save().catch(reportError)
        }

        const initialState = snapshot()
        onRouteChange?.(mounted.game.plannedRoute().length)
        if (initialState) onReady?.(initialState)
      } catch (reason) {
        reportError(reason)
      }
    }

    void init()

    return () => {
      disposed = true
      if (saveTimer) clearTimeout(saveTimer)
      void save().catch(() => {
        // Unmount must remain non-blocking; the adapter already retains an
        // offline fallback when the remote write cannot complete.
      })
      resizeObserver?.disconnect()
      document.removeEventListener('visibilitychange', syncVisibility)
      unbindHostEvents?.()
      unbindStateChanged?.()
      unbindRoutePointer?.()
      unbindPhoto?.()
      unbindDiscovery?.()
      mounted?.destroy()
      mounted = null
      gameRef.current = null
      if (app?.renderer) app.destroy()
      app = null
    }
    // seedCargo/seedCache intentionally excluded — see seedCargoRef/seedCacheRef above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    adapter,
    bodyId,
    lifeStage,
    missionId,
    onError,
    onEvent,
    onRouteChange,
    onReady,
    readOnly,
    rover,
    roverName,
    seed,
    targetId,
  ])

  return (
    <div className={[styles.mount, className].filter(Boolean).join(' ')} data-readonly={readOnly || undefined}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={readOnly ? { pointerEvents: 'none' } : undefined}
        aria-label={readOnly ? `Read-only visit to ${bodyId}` : `Surface operations on ${bodyId}`}
      />
      {error && (
        <p className={styles.error} role="alert">
          Surface operations unavailable: {error}
        </p>
      )}
    </div>
  )
})

export default TakeOnMount
