import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hashSeed, WorldRandom } from './rng'
import { skyAt } from './sky-calendar'
import { WORLD_SCENE, advance, applySky, createWorld, spawn, stepBodies, type World } from './world-sim'

const FIXTURE = join(process.cwd(), '../shared/scenes/world-fixture.json')

/** The cases native replays (LandnamCore WorldSimTests) and must match to 1e-6. */
function fixtureCases() {
  const rngs = ['landnam-sky-v1:weather:2026-10-14:5', 'base'].map(key => {
    const r = WorldRandom.from(key)
    return { key, seed: hashSeed(key), first: [r.next(), r.next(), r.next()] }
  })
  const run = (prefab: string, over: Record<string, number>, steps: number, wind: number) => {
    const world: World = createWorld('fixture')
    world.entities = []
    world.wind = wind
    const e = spawn(world, prefab, over)!
    for (let i = 0; i < steps; i += 1) stepBodies(world, WORLD_SCENE.physics.fixedStep)
    const found = world.entities.find(x => x.id === e.id)
    return { prefab, over, steps, wind, alive: !!found, x: found?.x ?? null, y: found?.y ?? null, vx: found?.vx ?? null, vy: found?.vy ?? null, count: world.entities.length }
  }
  return {
    rngs,
    bodies: [
      run('raindrop', { x: 10, y: 100, vy: -150, floor: -10 }, 30, 5),
      run('balloon', { x: 360, y: 26 }, 120, 6),
      run('far-rocket', { x: 470, y: 56 }, 180, 0),
      run('meteor', { x: 50, y: 150, vx: 100, vy: -180 }, 30, 0),
    ],
  }
}

describe('base world', () => {
  it('loads every background piece as its own entity, with sprites from the scene', () => {
    const world = createWorld()
    const ids = world.entities.map(e => e.id)
    expect(ids).toEqual(expect.arrayContaining(['ground', 'steppe', 'escarpment-far-1', 'escarpment-mid-1', 'cloud-1']))
    for (const e of world.entities) {
      if (e.def.sprite) expect(WORLD_SCENE.sprites).toHaveProperty(e.def.sprite)
    }
  })

  it('gives every landscape its own flat horizon, plants and drifts on top of the shared paving and clouds', () => {
    const sprites = (biome: string) => new Set(createWorld('base', biome).entities.map(e => e.def.sprite))
    const expectations: Record<string, string[]> = {
      mountains: ['steppe-plain', 'escarpment-a-mid', 'tussock-0'],
      desert: ['plain-desert', 'butte-a-far', 'dune-ridge-mid', 'saxaul', 'sand-drift-0'],
      tundra: ['plain-tundra', 'snow-ridge-far', 'ice', 'snow-drift-0'],
      coast: ['plain-coast', 'headland-far', 'coast-dune-ridge-mid', 'dune-grass', 'sand-drift-1'],
    }
    for (const [biome, want] of Object.entries(expectations)) {
      const got = sprites(biome)
      for (const s of [...want, 'ground-complex', 'cloud-0']) expect(got.has(s), `${biome} ${s}`).toBe(true)
    }
    expect(sprites('desert').has('escarpment-a-mid')).toBe(false)
  })

  it('snows in the tundra and raises dust in a windy desert', () => {
    const view = { w: 463, h: 214 }
    const tundra = createWorld('base', 'tundra')
    const snow = skyAt(new Date(2026, 0, 10, 14), 'afternoon', 'tundra', ['rain'])
    expect(snow.weather.precip).toBe('snow')
    for (let i = 0; i < 40; i += 1) applySky(tundra, snow, view, 1 / 20)
    expect(tundra.entities.some(e => e.def.shape === 'dot' && e.def.colour === '#f6f9fc')).toBe(true)
    expect(tundra.entities.some(e => e.def.shape === 'line')).toBe(false)
    const desert = createWorld('base', 'desert')
    const wind = skyAt(new Date(2026, 0, 10, 14), 'afternoon', 'desert', ['windy'])
    expect(wind.weather.dust).toBe(true)
    for (let i = 0; i < 40; i += 1) applySky(desert, wind, view, 1 / 20)
    expect(desert.entities.some(e => e.def.colour === '#e8d9b8')).toBe(true)
  })

  it('has no mountains, forest or buildings in the background', () => {
    const sprites = Object.keys(WORLD_SCENE.sprites)
    expect(sprites.some(s => /mountain|pine|tree|forest|hall|tower|building/.test(s))).toBe(false)
  })

  it('drops rain under gravity and splashes it on the ground', () => {
    const world = createWorld()
    world.entities = []
    spawn(world, 'raindrop', { x: 0, y: 4, vy: -150, floor: 0 })
    for (let i = 0; i < 10; i += 1) stepBodies(world, 1 / 60)
    expect(world.entities.map(e => e.def.shape)).toEqual(['puff'])
  })

  it('blows clouds with the wind and wraps them round the strip', () => {
    const world = createWorld()
    world.wind = 40
    const cloud = world.entities.find(e => e.id === 'cloud-1')!
    const x0 = cloud.x
    advance(world, 0.25)
    expect(cloud.x).toBeGreaterThan(x0)
    cloud.x = 700
    advance(world, 0.02)
    expect(cloud.x).toBeLessThan(0)
  })

  it('climbs a distant launch on a gravity turn and leaves a contrail', () => {
    const world = createWorld()
    world.entities = []
    const rocket = spawn(world, 'far-rocket', { x: 470, y: 56 })!
    for (let i = 0; i < 600; i += 1) stepBodies(world, 1 / 60)
    expect(rocket.y).toBeGreaterThan(56 + 50)
    expect(rocket.x).toBeGreaterThan(470)
    expect(world.entities.filter(e => e.def.shape === 'puff').length).toBeGreaterThan(40)
  })

  it('turns sky events into objects and retires them when the event ends', () => {
    const world = createWorld()
    const view = { w: 463, h: 214 }
    const night = skyAt(new Date(2026, 9, 21, 22, 0, 0), 'night', 'mountains', ['meteors', 'storm', 'aurora', 'comet'])
    for (let i = 0; i < 60; i += 1) applySky(world, night, view, 1 / 20)
    expect(world.entities.some(e => e.def.shape === 'streak')).toBe(true)
    expect(world.entities.some(e => e.def.shape === 'line')).toBe(true)
    expect(world.entities.some(e => e.def.shape === 'ribbon')).toBe(true)
    expect(world.entities.some(e => e.def.shape === 'comet')).toBe(true)
    const clear = { events: [], weather: { ...night.weather, kind: 'clear' as const, rainPerSecond: 0, boltEvery: 0 } }
    applySky(world, clear, view, 1 / 20)
    expect(world.entities.some(e => e.def.shape === 'ribbon' || e.def.shape === 'comet')).toBe(false)
  })

  it('reads the real calendar: Orionids peak, the August 2026 eclipse, Venus at dusk', () => {
    const orionids = skyAt(new Date(2026, 9, 21, 23), 'night', 'mountains').events.find(e => e.id === 'orionids')
    expect(orionids?.perMinute).toBeCloseTo(5)
    expect(skyAt(new Date(2026, 9, 21, 12), 'midday', 'mountains').events.some(e => e.kind === 'meteors')).toBe(false)
    expect(skyAt(new Date(2026, 7, 12, 12), 'midday', 'mountains').events.some(e => e.kind === 'eclipse-solar')).toBe(true)
    expect(skyAt(new Date(2026, 5, 1, 19), 'dusk', 'mountains').events.some(e => e.id === 'venus-evening')).toBe(true)
  })

  it('weights weather by landscape', () => {
    const tally = (biome: string) => {
      const out: Record<string, number> = {}
      for (let day = 0; day < 400; day += 1) {
        const w = skyAt(new Date(2026, 0, 1 + day, 14), 'afternoon', biome).weather.kind
        out[w] = (out[w] ?? 0) + 1
      }
      return out
    }
    const t = { mountains: tally('mountains'), desert: tally('desert'), tundra: tally('tundra'), coast: tally('coast') }
    expect(t.mountains.windy).toBeGreaterThan(t.tundra.windy ?? 0)
    expect(t.desert.clear).toBeGreaterThan(t.coast.clear)
    expect((t.coast.rain ?? 0) + (t.coast.storm ?? 0)).toBeGreaterThan((t.desert.rain ?? 0) + (t.desert.storm ?? 0))
  })

  it('gives every player the same sky for the same local time', () => {
    const a = skyAt(new Date(2026, 9, 14, 15, 30), 'afternoon', 'mountains')
    const b = skyAt(new Date(2026, 9, 14, 15, 30), 'afternoon', 'mountains')
    expect(a).toEqual(b)
  })

  it('matches the shared fixture native replays', () => {
    const cases = fixtureCases()
    if (process.env.WRITE_WORLD_FIXTURE) writeFileSync(FIXTURE, JSON.stringify(cases, null, 2) + '\n')
    expect(JSON.parse(readFileSync(FIXTURE, 'utf8'))).toEqual(JSON.parse(JSON.stringify(cases)))
  })
})
