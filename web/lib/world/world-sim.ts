import scene from './base-world.json'
import { WorldRandom } from './rng'
import type { SkyEvent, SkyState } from './sky-calendar'

/**
 * The base world as game objects (SSL-423): entities loaded from shared/scenes/base-world.json, stepped at a
 * fixed rate with simple physics (velocity, acceleration, gravity, drag, wind, ground collision, lifetimes),
 * plus spawners driven by the sky calendar. Pure data and pure functions, so it runs the same in tests, on the
 * canvas renderer and, line for line, in native LandnamCore (World/WorldSim.swift).
 */
export const WORLD_SCENE = scene

export type Shape = 'streak' | 'line' | 'puff' | 'bolt' | 'dot' | 'bank' | 'disc' | 'ribbon' | 'comet'
export type GroundMode = 'none' | 'stop' | 'splash' | 'bounce'

export interface BodyDef {
  vx?: number
  vy?: number
  ax?: number
  ay?: number
  /** Multiplier on world gravity; 0 (the default) floats. */
  gravity?: number
  /** How strongly the body follows the wind, 0..1. */
  wind?: number
  drag?: number
  ground?: GroundMode
  /** Prefab spawned where a 'splash' body lands (default: splash). */
  impact?: string
  bounce?: number
  life?: number
  /** Scale growth per second (exhaust puffs). */
  grow?: number
  fade?: boolean
  /** Heading change per second for thrusting bodies (gravity turn), radians. */
  pitch?: number
}

export interface EntityDef {
  id?: string
  sprite?: string
  shape?: Shape
  colour?: string
  length?: number
  width?: number
  radius?: number
  alpha?: number
  height?: number
  x?: number
  y?: number
  depth?: number
  layer?: number
  scale?: number
  /** Sky objects live in screen space (x across the view, y up from the ground line), not on the strip. */
  sky?: boolean
  body?: BodyDef
  wrap?: number[]
  emit?: { prefab: string; every: number }
}

export interface Entity {
  id: string
  def: EntityDef
  x: number
  y: number
  vx: number
  vy: number
  /** Heading for thrusting bodies, radians from straight up. */
  heading: number
  scale: number
  alpha: number
  age: number
  /** Ground height this body lands on (rain falls onto the visible ground, not one line). */
  floor: number
  emitClock: number
  /** The sky event that spawned it, removed when the event ends. */
  event?: string
  /** Shape-specific seed (bolt zigzags, ribbon sway). */
  seed: number
}

export interface WorldView {
  /** View size in kit units. */
  w: number
  h: number
  /** Camera pan in screen px and points per kit unit, to place event objects where the player is looking. */
  camX?: number
  px?: number
}

/** Strip x that shows at a fraction across the view for an object at `depth` (parallax), in kit units. */
export function stripXAt(view: WorldView, frac: number, depth: number): number {
  const px = view.px ?? 2
  return (frac * view.w * px - (view.camX ?? 0) * depth) / px
}

export interface World {
  entities: Entity[]
  time: number
  wind: number
  rng: WorldRandom
  nextId: number
  activeEvents: Set<string>
  spawnClock: Record<string, number>
  /** Screen flash from lightning, 0..1. */
  flash: number
  sky: SkyState | null
}

const PHYSICS = scene.physics
const PREFABS = scene.prefabs as Record<string, EntityDef>

function makeEntity(world: World, def: EntityDef, over: Partial<Entity> = {}): Entity {
  world.nextId += 1
  return {
    id: def.id ?? `e${world.nextId}`,
    def,
    x: def.x ?? 0,
    y: def.y ?? 0,
    vx: def.body?.vx ?? 0,
    vy: def.body?.vy ?? 0,
    heading: 0,
    scale: def.scale ?? 1,
    alpha: def.alpha ?? 1,
    age: 0,
    floor: PHYSICS.groundY,
    emitClock: 0,
    seed: world.rng.next(),
    ...over,
  }
}

/** A world for one landscape: the common entities (paving, clouds) plus that landscape's own set. */
export function createWorld(seedKey = 'base', biome = 'mountains'): World {
  const world: World = {
    entities: [],
    time: 0,
    wind: 0,
    rng: WorldRandom.from(seedKey),
    nextId: 0,
    activeEvents: new Set(),
    spawnClock: {},
    flash: 0,
    sky: null,
  }
  const land = (scene.biomes as Record<string, EntityDef[]>)[biome] ?? (scene.biomes as Record<string, EntityDef[]>).mountains
  for (const def of [...(scene.entities as EntityDef[]), ...land]) world.entities.push(makeEntity(world, def))
  return world
}

export function spawn(world: World, prefab: string, over: Partial<Entity> = {}): Entity | null {
  const def = PREFABS[prefab]
  if (!def) return null
  const e = makeEntity(world, def, over)
  world.entities.push(e)
  return e
}

/** One fixed physics step for every body. */
export function stepBodies(world: World, dt: number): void {
  const survivors: Entity[] = []
  const born: Entity[] = []
  for (const e of world.entities) {
    const b = e.def.body
    if (!b) { survivors.push(e); continue }
    e.age += dt
    if (b.life != null && e.age >= b.life) continue
    if (b.pitch) e.heading += b.pitch * dt
    const thrust = b.ay ?? 0
    const ax = (b.ax ?? 0) + (b.pitch ? Math.sin(e.heading) * thrust : 0)
    const ay = (b.pitch ? Math.cos(e.heading) * thrust : thrust) + PHYSICS.gravity * (b.gravity ?? 0)
    e.vx += ax * dt
    e.vy += ay * dt
    if (b.wind) e.vx += (world.wind * PHYSICS.windScale * b.wind - e.vx) * Math.min(1, dt * 0.5)
    if (b.drag) {
      const k = Math.exp(-b.drag * dt)
      e.vx *= k
      e.vy *= k
    }
    e.x += e.vx * dt
    e.y += e.vy * dt
    if (b.grow) e.scale += b.grow * dt
    if (b.fade && b.life) e.alpha = (e.def.alpha ?? 1) * Math.max(0, 1 - e.age / b.life)
    if (e.def.wrap) {
      const [lo, hi] = e.def.wrap
      if (e.x > hi) e.x = lo
      else if (e.x < lo) e.x = hi
    }
    if (b.ground && b.ground !== 'none' && e.y <= e.floor) {
      if (b.ground === 'splash') {
        const hit = PREFABS[b.impact ?? 'splash']
        const s = hit ? makeEntity(world, hit, { x: e.x, y: e.floor, event: e.event }) : null
        if (s) born.push(s)
        continue
      }
      if (b.ground === 'stop') { e.y = e.floor; e.vx = 0; e.vy = 0 }
      if (b.ground === 'bounce') { e.y = e.floor; e.vy = -e.vy * (b.bounce ?? 0.4) }
    }
    if (e.def.emit) {
      e.emitClock += dt
      while (e.emitClock >= e.def.emit.every) {
        e.emitClock -= e.def.emit.every
        const child = PREFABS[e.def.emit.prefab]
        if (child) born.push(makeEntity(world, child, { x: e.x, y: e.y, event: e.event }))
      }
    }
    survivors.push(e)
  }
  world.entities = survivors.concat(born)
}

/** Spawns and retires event objects for the current sky. `view` is the visible area in kit units; `camX` is the
 *  strip x at the left of the view, so weather falls where the player is looking. */
export function applySky(world: World, sky: SkyState, view: WorldView, dt: number): void {
  world.sky = sky
  world.wind = sky.weather.wind
  const live = new Set(sky.events.map(e => e.id))
  // Fog is weather, not an event: three banks drift across the steppe while it lasts.
  if (sky.weather.kind === 'fog') {
    live.add('weather-fog')
    if (!world.entities.some(e => e.event === 'weather-fog')) {
      for (const f of [0.15, 0.5, 0.85]) spawn(world, 'fog', { x: stripXAt(view, f, 0.6), y: 8 + world.rng.range(0, 10), event: 'weather-fog' })
    }
  }
  // Retire objects whose event has ended (meteors already in flight finish their streak).
  world.entities = world.entities.filter(e => !e.event || live.has(e.event) || e.def.shape === 'streak' || e.def.shape === 'puff')
  for (const ev of sky.events) {
    if (!world.activeEvents.has(ev.id)) {
      world.activeEvents.add(ev.id)
      startEvent(world, ev, view)
    }
    if (ev.kind === 'meteors' && ev.perMinute) emitAtRate(world, `m:${ev.id}`, ev.perMinute / 60, dt, () => {
      const angle = (world.rng.next() < 0.5 ? -1 : 1) * world.rng.range(0.12, 0.45)
      const speed = world.rng.range(30, 42)
      // Enter near the top of the sky and fall to the ground, landing in a flash.
      spawn(world, 'meteor', { x: world.rng.range(0, view.w), y: world.rng.range(view.h * 0.9, view.h), vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, floor: world.rng.range(-30, 0), event: ev.id })
    })
  }
  for (const id of [...world.activeEvents]) if (!live.has(id)) world.activeEvents.delete(id)
  const w = sky.weather
  const snow = w.precip === 'snow'
  if (w.rainPerSecond > 0) emitAtRate(world, 'rain', w.rainPerSecond * (snow ? 0.6 : 1), dt, () => {
    spawn(world, snow ? 'snowflake' : 'raindrop', { x: stripXAt(view, world.rng.range(-0.05, 1.05), 0.9), y: view.h, vy: snow ? -14 : -30, floor: world.rng.range(-36, 4) })
  })
  if (w.dust) emitAtRate(world, 'dust', 8, dt, () => {
    spawn(world, 'dust', { x: stripXAt(view, world.rng.range(-0.1, 0.9), 0.7), y: world.rng.range(0, 28), vx: w.wind })
  })
  if (w.boltEvery > 0) emitAtRate(world, 'bolt', 1 / w.boltEvery, dt, () => {
    spawn(world, 'bolt', { x: stripXAt(view, world.rng.range(0.1, 0.9), 0.1), y: view.h * 0.62 })
    world.flash = 1
  })
  world.flash = Math.max(0, world.flash - dt * 5)
}

function emitAtRate(world: World, key: string, perSecond: number, dt: number, make: () => void): void {
  const clock = (world.spawnClock[key] ?? world.rng.next() / perSecond) - dt
  let c = clock
  let guard = 0
  while (c <= 0 && guard < 50) {
    make()
    // Exponential gaps: showers and rain arrive irregularly, as they do.
    c += -Math.log(1 - world.rng.next() * 0.999) / perSecond
    guard += 1
  }
  world.spawnClock[key] = c
}

function startEvent(world: World, ev: SkyEvent, view: WorldView): void {
  const t = ev.elapsed ?? 0
  if (ev.kind === 'launch') {
    // A rocket from another pad far down the range, on the horizon behind the escarpments' gap.
    const r = spawn(world, 'far-rocket', { x: stripXAt(view, 0.74, 0.15), y: 56, event: ev.id })
    if (r && t > 0) fastForward(world, r, Math.min(t, 60), 0.1)
  } else if (ev.kind === 'balloon') {
    const b = spawn(world, 'balloon', { x: stripXAt(view, 0.62, 0.5), y: 26, event: ev.id })
    if (b && t > 0) fastForward(world, b, Math.min(t, 200), 0.25)
  } else if (ev.kind === 'satellite') {
    const seconds = 70
    spawn(world, 'satellite', { x: (t / seconds) * view.w, y: view.h * 0.86, vx: view.w / seconds, vy: -view.h * 0.002, event: ev.id })
  } else if (ev.kind === 'aurora') {
    world.entities.push(makeEntity(world, { shape: 'ribbon', colour: '#7fe0c8', alpha: 0.5, layer: 2, depth: 0, sky: true, height: 46 }, { x: 0, y: view.h * 0.62, event: ev.id }))
  } else if (ev.kind === 'comet') {
    world.entities.push(makeEntity(world, { shape: 'comet', colour: '#eef6ff', length: 46, radius: 2.2, layer: 3, depth: 0, sky: true }, { x: view.w * 0.3, y: view.h * 0.82, event: ev.id }))
  } else if (ev.kind === 'planet') {
    world.entities.push(makeEntity(world, { shape: 'dot', colour: '#fff7de', radius: 1.8, layer: 3, depth: 0, sky: true }, { x: view.w * (ev.x ?? 0.7), y: view.h * (ev.y ?? 0.6), event: ev.id }))
  }
}

/** Advance one body and what it emits, alone (an event that started before the player looked). */
function fastForward(world: World, e: Entity, seconds: number, step: number): void {
  const saved = world.entities
  world.entities = [e]
  for (let s = 0; s < seconds; s += step) stepBodies(world, step)
  const result = world.entities
  const alive = result.find(x => x === e)
  world.entities = (alive ? saved : saved.filter(x => x !== e)).concat(result.filter(x => x !== e))
}

/** Advance the world by `dt` seconds in fixed steps. Returns leftover time for the next frame. */
export function advance(world: World, dt: number, carry = 0): number {
  let acc = carry + Math.min(dt, 0.25)
  const step = PHYSICS.fixedStep
  while (acc >= step) {
    stepBodies(world, step)
    world.time += step
    acc -= step
  }
  return acc
}
