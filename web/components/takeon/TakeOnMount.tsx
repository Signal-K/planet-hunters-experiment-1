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
  SyncAdapter,
} from '@takeon/engine'
import { LandnamSync } from '@/lib/takeon/LandnamSync'
import {
  bindTakeonHostEvents,
  notificationForTakeonEvent,
  type TakeonHostEvent,
} from '@/lib/takeon/events'
import { scheduleLandnamPush } from '@/lib/takeon/push'
import styles from './TakeOnMount.module.css'

export interface TakeOnMountHandle {
  /** Deposit all rover cargo into an adjacent cache. Returns units moved. */
  deposit: () => number
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
  onEvent?: (event: TakeonHostEvent) => void
  onReady?: (mission: MissionState) => void
  onError?: (error: Error) => void
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
  onEvent,
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

  useImperativeHandle(ref, () => ({
    deposit: () => gameRef.current?.deposit() ?? 0,
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
    let unbindPhoto: (() => void) | null = null
    let unbindDiscovery: (() => void) | null = null
    let disposed = false

    const snapshot = (): MissionState | null => {
      if (!mounted) return null
      return {
        ...mounted.game.save(),
        id: missionId,
        bodyId,
      }
    }

    const save = async () => {
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
        const { getBody } = await import('@takeon/engine')
        const body = getBody(bodyId)
        if (!body) throw new Error(`Unknown Takeon body: ${bodyId}`)

        // Seeded scenes (a tutorial dropoff, etc.) are ephemeral flavor —
        // Landnam owns the persisted delivery state, not Takeon — so they
        // always start fresh rather than resuming a prior save under the
        // same missionId.
        const isSeeded = !!(seedCargoRef.current || seedCacheRef.current)
        const resume = isSeeded ? null : await adapter.loadMission(missionId)
        if (disposed) return

        app = new PIXI.Application()
        await app.init({
          canvas: canvasElement,
          width: canvasElement.clientWidth || 800,
          height: canvasElement.clientHeight || 600,
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
          width: app.canvas.width,
          height: app.canvas.height,
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
          if (saveTimer) clearTimeout(saveTimer)
          saveTimer = setTimeout(() => void save().catch(reportError), 750)
        })
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

        mounted.game.start()
        gameRef.current = mounted.game

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
        }

        const initialState = snapshot()
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
      unbindHostEvents?.()
      unbindStateChanged?.()
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
    missionId,
    onError,
    onEvent,
    onReady,
    rover,
    roverName,
    seed,
  ])

  return (
    <div className={[styles.mount, className].filter(Boolean).join(' ')}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label={`Surface operations on ${bodyId}`}
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
