// The asset manifest is the one place a typo produces no error and no crash —
// AssetManager resolves a miss to the magenta placeholder, so a broken entry
// looks like an art bug and survives for months.
//
// It did: twelve of twenty-seven entries pointed at files that had never
// existed on disk, including an entire eleven-asset launch sequence, and
// nothing in code referenced any of them. These tests are the guard.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const PUBLIC = join(process.cwd(), 'public')
const MANIFEST_PATH = join(PUBLIC, 'game/assets/manifest.json')

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Record<string, string>

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('asset manifest', () => {
  it('is not empty', () => {
    expect(Object.keys(manifest).length).toBeGreaterThan(0)
  })

  it('points every entry at a file that exists', () => {
    const dangling = Object.entries(manifest)
      .filter(([, path]) => !existsSync(join(PUBLIC, path)))
      .map(([name, path]) => `${name} -> ${path}`)
    expect(dangling).toEqual([])
  })

  it('uses absolute public paths', () => {
    for (const [name, path] of Object.entries(manifest)) {
      expect({ name, ok: path.startsWith('/') }).toEqual({ name, ok: true })
    }
  })

  it('has no two names resolving to the same file', () => {
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const [name, path] of Object.entries(manifest)) {
      const prior = seen.get(path)
      if (prior) dupes.push(`${prior} and ${name} both -> ${path}`)
      else seen.set(path, name)
    }
    expect(dupes).toEqual([])
  })

  // Pre-existing hand-made sprites that used to blow the budget — all seven
  // (ship_sr1/sr2/cutaway, four room interiors) were re-rendered through the
  // Blender pipeline (STS-611) and now fit well under SIZE_BUDGET_BYTES like
  // everything else, so the list is empty rather than removed outright: it's
  // the record of what "photographic PNG in a flat-faceted game" looked like,
  // and the guard that catches anything sliding back into that shape.
  //
  // This list may shrink. It must never grow.
  const LEGACY_OVERSIZED = new Set<string>([])
  const SIZE_BUDGET_BYTES = 250_000

  it('keeps every new sprite small enough to be worth shipping', () => {
    // Not a hard engine limit — a budget. These are flat-colour faceted
    // sprites; anything into the hundreds of KB means something was rendered
    // at the wrong scale or picked up a gradient it should not have.
    const oversized = Object.entries(manifest)
      .filter(([name]) => !LEGACY_OVERSIZED.has(name))
      .map(([name, path]) => [name, statSync(join(PUBLIC, path)).size] as const)
      .filter(([, size]) => size > SIZE_BUDGET_BYTES)
      .map(([name, size]) => `${name} (${Math.round(size / 1024)} KB)`)
    expect(oversized).toEqual([])
  })

  it('does not let the legacy-oversized list grow stale', () => {
    // If one of these gets re-rendered and drops under budget, it should leave
    // the list rather than sit here implying a problem that no longer exists.
    const stillOversized = [...LEGACY_OVERSIZED].filter(name => {
      const path = manifest[name]
      return path && statSync(join(PUBLIC, path)).size > SIZE_BUDGET_BYTES
    })
    expect(stillOversized.sort()).toEqual([...LEGACY_OVERSIZED].sort())
  })
})

describe('production hub and actor sprites', () => {
  const RENDERED = ['game/assets/hub', 'game/assets/actors']

  it('has every shipped hub and actor sprite registered in the manifest', () => {
    // The reverse of the dangling check: a sprite rendered but never added to
    // the manifest is invisible to AssetManager and silently unused.
    const registered = new Set(Object.values(manifest))
    const unregistered = RENDERED.flatMap(dir => walk(join(PUBLIC, dir)))
      .filter(f => extname(f) === '.png')
      .map(f => '/' + f.slice(PUBLIC.length + 1))
      .filter(p => !registered.has(p))
    expect(unregistered).toEqual([])
  })

  it('renders the Earth Base structure slots hubScene declares', () => {
    for (const name of [
      'hub_pad_deck', 'hub_pad_gantry_frame', 'hub_pad_swing_arm',
      'hub_pad_clamp', 'hub_pad_mast', 'hub_pad_tank',
      'hub_pad_complex', 'hub_pad_hangar', 'hub_pad_complex_v2', 'hub_pad_hangar_v2',
      'hub_pad_complex_v3', 'hub_pad_hangar_v3',
      'hub_depot_tank', 'hub_scan_dish', 'hub_refinery_modular_v2', 'hub_scan_station_modular_v2',
      'hub_cmd_building',
      'hub_deep_space_telescope', 'hub_astronaut_academy',
    ]) {
      expect({ name, present: name in manifest }).toEqual({ name, present: true })
    }
  })

  it('renders the two non-human crew archetypes', () => {
    // Astronauts deliberately have no sprite — Q31, "just names".
    expect('actor_rover' in manifest).toBe(true)
    expect('actor_drone' in manifest).toBe(true)
    expect('actor_astronaut' in manifest).toBe(false)
  })
})
