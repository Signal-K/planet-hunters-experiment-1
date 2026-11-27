'use client'

import { installHighObliqueRover } from '@/lib/takeon/highObliqueRover'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  ActiveWeather,
  BodyDef,
  MissionState,
  ResourceKey,
  RoverGame,
  RoverSpec,
  StructureType,
  SyncAdapter,
  ViewKind,
} from '@takeon/engine'
import type { LifeStage, SurfaceTarget } from '@/lib/data'
import type { MissionZone } from '@/lib/data/mission-zone'
import { assertSolarFieldRestored, readSolarFieldIdentity, solarFieldIdentity, writeSolarFieldIdentity, type SolarFieldIdentity } from '@/lib/takeon/solarFieldIdentity'
import { LandnamSync } from '@/lib/takeon/LandnamSync'
import { applyTerrainLook, DEFAULT_TERRAIN_LOOK, terrainLookForTarget } from '@/lib/takeon/terrainColour'
import { buildLandnamBody, registerLandnamSandbox } from '@/lib/takeon/sandbox'
import { assistedClimb, type DrivableWorld } from '@/lib/takeon/drivable'
import { installFieldProbeGlyph } from '@/lib/takeon/fieldProbeGlyph'
import { installLandnamStructureGlyphs } from '@/lib/takeon/structureGlyphs'
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

const TAKEON_KEY_DIR: Record<string, 0 | 1 | 2 | 3> = {
  arrowright: 0, d: 0, arrowdown: 1, s: 1, arrowleft: 2, a: 2, arrowup: 3, w: 3,
}

export type TakeOnBlockedReason = 'cliff' | 'battery' | 'edge' | 'busy'

export interface TakeOnRoverPose {
  x: number
  y: number
  /** True while the rover is animating between tiles. */
  moving: boolean
  /** Battery 0..1 as a fraction of capacity. */
  battery: number
}

export interface TakeOnMountHandle {
  /** Stop future saves before discarding this mount's conflicted local field. */
  stopSaving: () => Promise<void>
  /** Snapshot and durably queue the current field before leaving it. */
  saveNow: () => Promise<MissionState | null>
  currentState: () => MissionState | null
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
  /** Drive to an exposed column and drill it from an adjacent tile. */
  orderMine: (x: number, y: number) => void
  /** Start a manual drill on the column directly ahead of the rover. */
  mine: () => boolean
  /**
   * Empty the rover's own Takeon hold. For hosts that count the haul themselves (the rover survey): otherwise
   * loose regolith fills Takeon's hold and every later drill is silently refused as full.
   */
  emptyCargo: () => void
  /** Scanner sweep. Takeon's own control is the X key on the field canvas. */
  scan: () => void
  /**
   * Drive one tile in a screen-relative direction (0 right/SE, 1 down/SW,
   * 2 left/NW, 3 up/NE as seen). Clears any tap-to-drive order. False when
   * the tile ahead is not traversable.
   */
  move: (dir: 0 | 1 | 2 | 3) => boolean
  /** Where the rover is and whether it is mid-step, for the drive readout. */
  rover: () => TakeOnRoverPose | null
  /** Subscribe to refused moves (cliff, edge, battery, busy). Returns an unsubscribe. */
  onBlocked: (handler: (reason: TakeOnBlockedReason) => void) => () => void
  view: () => ViewKind | null
  setView: (kind: ViewKind) => void
  toggleView: () => ViewKind | null
  rotateView: () => void
  /**
   * Go WASM runtime (docs/takeon-go-wasm.md), once loaded. Always null unless
   * NEXT_PUBLIC_TAKEON_GO_WASM=1; the field itself still runs on the TS engine.
   */
  /** Structures currently placed on the field (read-only snapshot for sharing). */
  structures: () => { id: string; type: StructureType; x: number; y: number; facing: number }[]
}

export interface TakeOnMountProps {
  missionId: string
  bodyId: string
  /**
   * The rover this scene drives. Leave it out for a scene that only shows the
   * ground (a landing): Takeon then draws no rover.
   */
  rover?: RoverSpec
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
  target?: SurfaceTarget & { minerals?: readonly string[] }
  zone?: MissionZone
  /** A mission with an explicitly selected solar site must not use unrelated fallback terrain. */
  requireSolarTerrain?: boolean
  /** Only the dedicated versioned-field adapter or an isolated fixture may create a new field. */
  allowSolarFieldCreation?: boolean
  /** Generate Landnam's distinct mineral resources in the solar subsurface. */
  solarMining?: boolean
  lifeStage?: LifeStage
  /** Read-only visit: pointer input is disabled and no save is written. */
  readOnly?: boolean
  /** Declarative field conditions for an observation visit; never mutates the body catalog. */
  fieldWeather?: { rates: BodyDef['weather']; initial: ActiveWeather | null }
  /**
   * View the field opens in. Landnam defaults to the flat top-down map
   * (SSL-316 decision, 2026-09-19): screen up/down/left/right map straight
   * onto world tiles on every device, so tap-to-drive and the drive pad
   * need no rotated-axis reasoning. The iso diorama stays one toggle away.
   */
  startView?: ViewKind
  onEvent?: (event: TakeonHostEvent) => void
  /** Host-facing route state for the safe tap-to-drive planner. */
  onRouteChange?: (steps: number) => void
  onReady?: (mission: MissionState) => void
  /** E / Space on the keyboard. When set, the host drills (so it can dig down); otherwise the mount drills. */
  onMineKey?: () => void
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

/** The parts of a mounted Takeon game this file reaches past the public API for. */
interface DrillableGame {
  mine: () => boolean
  sim: { rover: { facing: 0 | 1 | 2 | 3 } }
}

/**
 * Drill the column ahead, or failing that whichever neighbour can be drilled, so the
 * player does not have to line the rover up first (Liam, 2026-10-30: easier Takeon).
 */
export function drillAnySide(game: DrillableGame): boolean {
  const rover = game.sim.rover
  const start = rover.facing
  for (let turn = 0; turn < 4; turn++) {
    rover.facing = ((start + turn) % 4) as 0 | 1 | 2 | 3
    if (game.mine()) return true
  }
  rover.facing = start
  return false
}

/**
 * Give the rover enough climb to leave its landing site (see lib/takeon/drivable.ts).
 * Rough bodies keep their cliffs; the wheels just get one more step where they need it.
 */
function openLandingSite(game: unknown): void {
  const sim = (game as { sim?: { world?: DrivableWorld; rover?: { pos?: { x: number; y: number }; stats?: { maxClimb?: number } } } }).sim
  const world = sim?.world
  const rover = sim?.rover
  if (!world || !rover?.pos || !rover.stats || typeof rover.stats.maxClimb !== 'number') return
  rover.stats.maxClimb = assistedClimb(world, rover.pos, rover.stats.maxClimb)
}

/** Keep the rover readable while leaving room to navigate around it. */
export function fieldZoom(viewport: { width: number; height: number }): number {
  return Math.min(viewport.width, viewport.height) < 500 ? 2.5 : 2.8
}

/**
 * Open the field at a readable distance and keep life where life is: the vendored
 * renderer scatters wandering critters, flora and a flyer on every body, which on an
 * airless asteroid reads as wrong. They stay only once a world is blooming or thriving.
 */
function settleFieldView(game: unknown, viewport: { width: number; height: number }, lifeStage: LifeStage | undefined): void {
  const renderer = (game as { renderer?: { camera?: { setZoom?: (z: number) => void }; critters?: unknown[]; flora?: unknown[]; flyers?: unknown[] } }).renderer
  renderer?.camera?.setZoom?.(fieldZoom(viewport))
  if (lifeStage === 'blooming' || lifeStage === 'thriving') return
  if (renderer?.critters) renderer.critters.length = 0
  if (renderer?.flora) renderer.flora.length = 0
  if (renderer?.flyers) renderer.flyers.length = 0
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
  roverName = rover?.name,
  seed,
  adapter: suppliedAdapter,
  className,
  seedCargo,
  seedCache,
  target,
  zone,
  requireSolarTerrain = false,
  allowSolarFieldCreation = false,
  solarMining = false,
  lifeStage = 'dormant',
  readOnly = false,
  fieldWeather,
  startView = 'flat',
  onEvent,
  onRouteChange,
  onReady,
  onMineKey,
  onError,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<RoverGame | null>(null)
  const snapshotRef = useRef<(() => MissionState | null) | null>(null)
  const saveRef = useRef<(() => Promise<MissionState | null>) | null>(null)
  const stopSavingRef = useRef(false)
  const pendingSavesRef = useRef(new Set<Promise<unknown>>())
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
  const callbacksRef = useRef({ onError, onEvent, onRouteChange, onReady, onMineKey })
  callbacksRef.current = { onError, onEvent, onRouteChange, onReady, onMineKey }

  // Only the target identity matters for the mount; a fresh object with the
  // same id must not remount the field.
  const targetId = target?.id
  const targetRef = useRef(target)
  targetRef.current = target

  // Takeon's own canvas Controls never receive keys inside Landnam (the E drill key did nothing either), so
  // the arrow keys looked broken. Landnam drives the rover from the keyboard itself, with Takeon's key map:
  // arrows/WASD drive (a held key keeps driving), E or Space drills, X scans. A duplicate press from Takeon's
  // Controls, if they ever do fire, is refused as "busy" by the simulation, so it cannot double-move.
  useEffect(() => {
    if (readOnly) return
    const held = new Set<string>()
    const ignore = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return true
      const tag = (event.target as HTMLElement | null)?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (ignore(event)) return
      const game = gameRef.current
      if (!game) return
      const key = event.key.toLowerCase()
      const dir = TAKEON_KEY_DIR[key]
      if (dir !== undefined) {
        event.preventDefault()
        if (!held.has(key)) game.move(dir)
        held.add(key)
        return
      }
      if (event.repeat) return
      if (key === 'e' || key === ' ') {
        event.preventDefault()
        const onMineKey = callbacksRef.current.onMineKey
        if (onMineKey) onMineKey()
        else drillAnySide(game)
      }
      else if (key === 'x') game.scan()
    }
    const onKeyUp = (event: KeyboardEvent) => { held.delete(event.key.toLowerCase()) }
    const onBlur = () => held.clear()
    // A held key keeps driving, one step attempt every 90 ms (Takeon's own repeat rate).
    const repeat = window.setInterval(() => {
      const game = gameRef.current
      if (!game) return
      for (const key of held) game.move(TAKEON_KEY_DIR[key])
    }, 90)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.clearInterval(repeat)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [readOnly])

  useImperativeHandle(ref, () => ({
    stopSaving: async () => {
      stopSavingRef.current = true
      await Promise.allSettled([...pendingSavesRef.current])
    },
    saveNow: () => saveRef.current?.() ?? Promise.resolve(null),
    currentState: () => snapshotRef.current?.() ?? null,
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
    orderMine: (x, y) => gameRef.current?.orderMine(x, y),
    mine: () => (gameRef.current ? drillAnySide(gameRef.current) : false),
    emptyCargo: () => {
      const rover = gameRef.current?.sim.rover
      if (!rover) return
      rover.cargo = {}
      rover.cargoUsed = 0
    },
    scan: () => { gameRef.current?.scan() },
    move: dir => gameRef.current?.move(dir) ?? false,
    rover: () => {
      const game = gameRef.current
      if (!game) return null
      const r = game.sim.rover
      const capacity = r.stats.batteryCapacity > 0 ? r.stats.batteryCapacity : 1
      return { x: r.pos.x, y: r.pos.y, moving: r.moveFrom !== null, battery: Math.max(0, Math.min(1, r.battery / capacity)) }
    },
    onBlocked: handler => {
      const game = gameRef.current
      if (!game) return () => {}
      return game.events.on('blocked', ({ reason }) => handler(reason))
    },
    view: () => gameRef.current?.view ?? null,
    setView: kind => gameRef.current?.setView(kind),
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
    let fieldUpload: (() => void) | null = null
    let fieldTexture: import('pixi.js').Texture | null = null
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let unbindHostEvents: (() => void) | null = null
    let unbindStateChanged: (() => void) | null = null
    let unbindRoutePointer: (() => void) | null = null
    let unbindPhoto: (() => void) | null = null
    let unbindDiscovery: (() => void) | null = null
    let disposed = false
    let fieldIdentity: SolarFieldIdentity | undefined

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
      const state = mounted.game.save()
      if (fieldIdentity && !state.coreSnapshot) throw new Error('Solar field snapshot unavailable')
      return {
        ...state,
        ...(fieldIdentity ? { coreSnapshot: writeSolarFieldIdentity(state.coreSnapshot!, fieldIdentity) } : {}),
        id: missionId,
        bodyId,
      }
    }

    const save = (): Promise<MissionState | null> => {
      // Seeded cargo/cache belongs to the host mission, not a persistent
      // field. Saving it here could overwrite a real field under this id.
      if (stopSavingRef.current || readOnly || seedCargoRef.current || seedCacheRef.current) return Promise.resolve(null)
      let state: MissionState | null
      try { state = snapshot() } catch (error) { return Promise.reject(error) }
      if (!state) return Promise.resolve(null)
      const pending = adapter.saveMission(state, roverName ?? 'Rover').then(() => state)
      pendingSavesRef.current.add(pending)
      void pending.then(() => pendingSavesRef.current.delete(pending), () => pendingSavesRef.current.delete(pending))
      return pending
    }
    snapshotRef.current = snapshot
    saveRef.current = save

    const reportError = (reason: unknown) => {
      const nextError = reason instanceof Error ? reason : new Error(String(reason))
      if (!disposed) setError(nextError.message)
      callbacksRef.current.onError?.(nextError)
    }

    async function init() {
      try {
        const PIXI = await import('pixi.js')
        const { mountRoverGame } = await import('@takeon/pixi')
        const engine = await import('@takeon/engine')
        // Landnam's structures (roads, factories, silos…) and its biome
        // palette must exist before a saved mission referencing them resumes.
        registerLandnamSandbox(engine)
        installHighObliqueRover(engine)
        installLandnamStructureGlyphs(engine)
        if (rover?.id === 'field-probe') installFieldProbeGlyph(engine)
        const currentTarget = targetRef.current
        const catalogBody = currentTarget
          ? buildLandnamBody(engine, bodyId, currentTarget, lifeStage)
          : engine.getBody(bodyId)
        let body = catalogBody ? engine.cloneBody(catalogBody) : undefined
        if (!body) throw new Error(`Unknown Takeon body: ${bodyId}`)
        if (solarMining && currentTarget) {
          const { registerSolarMiningMaterials, solarMiningBody } = await import('@/lib/takeon/solarMining')
          registerSolarMiningMaterials(engine.registerMaterial)
          body = solarMiningBody(body, currentTarget.minerals ?? [])
        }
        if (fieldWeather) body.weather = { ...fieldWeather.rates }
        // Terrain colour from what the body is made of and its likely conditions (terrainColour.ts).
        const look = currentTarget ? terrainLookForTarget(currentTarget) : DEFAULT_TERRAIN_LOOK
        applyTerrainLook(engine as unknown as Parameters<typeof applyTerrainLook>[0], look)
        body.palette = { sky: look.sky, skyNight: look.skyNight, tint: look.tint }

        // Seeded scenes (a tutorial dropoff, etc.) are ephemeral flavor —
        // Landnam owns the persisted delivery state, not Takeon — so they
        // always start fresh rather than resuming a prior save under the
        // same missionId.
        const isSeeded = !!(seedCargoRef.current || seedCacheRef.current)
        const resume = isSeeded ? null : await adapter.loadMission(missionId)
        if (disposed) return

        const savedSolar = readSolarFieldIdentity(resume?.coreSnapshot)
        const solarPreviewEnabled = process.env.NEXT_PUBLIC_TAKEON_SOLAR_PREVIEW === '1'
          || (solarMining && window.location.pathname === '/game/stage')
        if (requireSolarTerrain && !savedSolar && (!solarPreviewEnabled || !currentTarget || resume || (!readOnly && !isSeeded && !allowSolarFieldCreation))) {
          throw new Error('This landing site is unavailable. Pause and try again when solar terrain is available.')
        }
        if (savedSolar) {
          if (!currentTarget || savedSolar.bodyId !== currentTarget.id || (zone !== undefined && savedSolar.zone !== zone)) throw new Error('Saved solar field belongs to another landing site')
          const { registerSolarFieldMaterials } = await import('@/lib/takeon/solarField')
          const definitions: Parameters<typeof engine.registerMaterial>[0][] = []
          registerSolarFieldMaterials(savedSolar.bodyId, look.ground, definition => { definitions.push(definition) })
          if (savedSolar.palette && (Object.keys(savedSolar.palette).length !== definitions.length || definitions.some(definition => !savedSolar.palette?.[definition.id]))) throw new Error('Incomplete saved solar palette')
          for (const definition of definitions) engine.registerMaterial({ ...definition, ...(solarMining ? { yields: null } : {}), colors: savedSolar.palette?.[definition.id] ?? definition.colors })
          fieldIdentity = savedSolar
        }

        if (solarPreviewEnabled && currentTarget && !resume && (readOnly || isSeeded || allowSolarFieldCreation)) {
          try {
            const { loadLandingPreview } = await import('@/lib/takeon/solarLandingPreview')
            const { solarField } = await import('@/lib/takeon/solarField')
            const landing = await loadLandingPreview(currentTarget.id, zone)
            if (disposed) return
            const demId = `solar-v${landing.styleVersion}-${landing.bodyId}-${landing.seed}-${landing.longitude}`
            const identity = solarFieldIdentity(landing, zone)
            const palette: NonNullable<SolarFieldIdentity['palette']> = {}
            engine.registerDem(demId, solarField(landing, look.ground, definition => {
              palette[definition.id] = [...definition.colors]
              engine.registerMaterial(solarMining ? { ...definition, yields: null } : definition)
            }))
            identity.palette = palette
            body.dem = demId
            fieldIdentity = identity
          } catch (error) {
            if (requireSolarTerrain) throw new Error('Could not load the selected landing site. Pause or retry.', { cause: error })
            console.warn('Takeon solar terrain unavailable; using the existing field', error)
          }
        }

        const viewport = takeOnViewportSize(canvasElement)
        const sky = look.skyNight
        app = new PIXI.Application()
        await app.init({
          canvas: canvasElement,
          width: viewport.width,
          height: viewport.height,
          background: sky,
          backgroundAlpha: 1,
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
          view: readOnly ? undefined : app.canvas,
          // Keep the engine and Controls in CSS-pixel coordinates. The Pixi
          // backing buffer may be larger on a retina display.
          width: viewport.width,
          height: viewport.height,
          body,
          spec: rover,
          seed,
          resume: resume ?? undefined,
          startView,
        })
        if (savedSolar && resume?.coreSnapshot) {
          try { assertSolarFieldRestored(resume.coreSnapshot, mounted.game.save().coreSnapshot) }
          catch (error) { mounted.destroy(); mounted = null; throw error }
        }

        const handleHostEvent = (event: TakeonHostEvent) => {
          if (solarMining && event.type === 'mined' && mounted) {
            // Ordinary stone and regolith are terrain, not contract ore. The
            // host's exact mineral keys are the only cargo kept in this mode.
            const cargo = mounted.game.sim.rover.cargo
            for (const key of Object.keys(cargo)) if (!key.startsWith('landnam:')) delete cargo[key]
            mounted.game.sim.rover.cargoUsed = Object.values(cargo).reduce<number>((sum, amount) => sum + (amount ?? 0), 0)
          }
          callbacksRef.current.onEvent?.(event)
          // The Go simulation emits mined, not stateChanged, for a completed
          // drill. Save the terrain edit and rover cargo in the same snapshot.
          if (event.type === 'mined') void save().catch(reportError)
          const notification = notificationForTakeonEvent(event)
          if (notification) void scheduleLandnamPush(notification).catch(reportError)
        }
        unbindHostEvents = bindTakeonHostEvents(mounted.game.events, handleHostEvent)
        unbindStateChanged = mounted.game.events.on('stateChanged', () => {
          callbacksRef.current.onRouteChange?.(mounted?.game.plannedRoute().length ?? 0)
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
          callbacksRef.current.onRouteChange?.(mounted?.game.plannedRoute().length ?? 0)
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
          // The Pixi backing canvas must follow too, or a rotated phone shows the field squeezed into a strip.
          const { width, height } = entry.contentRect
          app?.renderer.resize(width, height)
          mounted.resize(width, height)
          // The vendored adapter's texture keeps its first GPU size, so after a phone turns only a corner of the
          // field showed. Give the sprite a fresh texture on the resized canvas and upload it ourselves (30 fps,
          // the adapter's rate); the adapter keeps updating its old, now unused texture.
          const sprite = mounted.sprite as unknown as import('pixi.js').Sprite
          const fieldCanvas = sprite.texture.source.resource as unknown
          if (!(fieldCanvas instanceof HTMLCanvasElement) || !app) return
          const previous = fieldTexture
          fieldTexture = new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: fieldCanvas }) })
          sprite.texture = fieldTexture
          previous?.destroy(true)
          sprite.width = width
          sprite.height = height
          if (!fieldUpload) {
            let last = 0
            fieldUpload = () => {
              const now = performance.now()
              if (now - last < 33) return
              last = now
              sprite.texture.source.update()
            }
            app.ticker.add(fieldUpload)
          }
        })
        resizeObserver.observe(canvasElement)

        openLandingSite(mounted.game)
        settleFieldView(mounted.game, viewport, lifeStage)
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
          // This is an ephemeral representation of host-owned cargo.
        }

        if (fieldWeather) mounted.game.sim.weather = fieldWeather.initial ? { ...fieldWeather.initial } : null
        const initialState = snapshot()
        callbacksRef.current.onRouteChange?.(mounted.game.plannedRoute().length)
        if (initialState) callbacksRef.current.onReady?.(initialState)
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
      snapshotRef.current = null
      saveRef.current = null
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
    readOnly,
    requireSolarTerrain,
    allowSolarFieldCreation,
    solarMining,
    fieldWeather,
    rover,
    roverName,
    seed,
    startView,
    targetId,
    zone,
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
