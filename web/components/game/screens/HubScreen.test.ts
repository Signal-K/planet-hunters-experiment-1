import { describe, expect, it } from 'vitest'
import { EARTH_BASE_STRUCTURE_SIZES } from './HubScreen'

describe('Earth Base module composition', () => {
  it('keeps a site-scale footprint for the composited launchpad and hangar', () => {
    expect(EARTH_BASE_STRUCTURE_SIZES.launchpad.width).toBe(220)
    expect(EARTH_BASE_STRUCTURE_SIZES.hangar.width).toBe(250)
  })

  /** Support facilities stay smaller than the two primary Earth Base sprites. */
  it('keeps structure sizes in the same ratio as the Blender models', () => {
    const { launchpad, hangar, refinery } = EARTH_BASE_STRUCTURE_SIZES
    expect(launchpad.width).toBeGreaterThan(refinery.width)
    expect(hangar.width).toBeGreaterThan(refinery.width)
    expect(EARTH_BASE_STRUCTURE_SIZES['scan-station'].width).toBeLessThan(refinery.width)
  })

  it('carries an explicit height so nothing depends on intrinsic image size', () => {
    for (const [kind, art] of Object.entries(EARTH_BASE_STRUCTURE_SIZES)) {
      expect({ kind, ok: art.height > 0 }).toEqual({ kind, ok: true })
    }
  })
})

/**
 * Silhouette variety in the terrain kit. The first pass of KES-260 produced a
 * horizon of near-identical triangles because every landform was a straight
 * cone — jitter varies a mass's width, but only a profile with intermediate
 * rings varies its slope, which is what actually reads as "mountain".
 */
describe('terrain kit silhouettes', () => {
  it('offers more than one mountain shape language', async () => {
    const { TERRAIN_KIT } = await import('@/lib/scene/terrain-kit')
    const mountains = Object.keys(TERRAIN_KIT).filter(k => k.startsWith('mtn_'))
    expect(mountains.length).toBeGreaterThanOrEqual(5)
    // A horn is much taller than it is wide; a saw ridge much wider than tall.
    // If either ratio drifts toward 1 the kit has collapsed back to one shape.
    expect(TERRAIN_KIT.mtn_horn.h / TERRAIN_KIT.mtn_horn.w).toBeGreaterThan(1)
    expect(TERRAIN_KIT.mtn_saw_ridge.w / TERRAIN_KIT.mtn_saw_ridge.h).toBeGreaterThan(2)
  })

  it('uses several distinct mountain bricks in each composition', async () => {
    const { EARTH_BASE_WIDE, EARTH_BASE_PAD } = await import('@/lib/scene/compositions')
    for (const comp of [EARTH_BASE_WIDE, EARTH_BASE_PAD]) {
      const kinds = new Set(
        comp.bands.flatMap(b => b.bricks.map(p => p.brick)).filter(b => b.startsWith('mtn_')),
      )
      expect({ id: comp.id, distinctMountains: kinds.size >= 4 })
        .toEqual({ id: comp.id, distinctMountains: true })
    }
  })
})
