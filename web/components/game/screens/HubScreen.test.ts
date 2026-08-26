import { describe, expect, it } from 'vitest'
import { HUB_STRUCTURE_ART } from './HubScreen'

describe('Hub structure art', () => {
  it('points every structure at its single rebuilt sprite', () => {
    expect(HUB_STRUCTURE_ART.refinery.src).toBe('/game/assets/hub/refinery.png')
    expect(HUB_STRUCTURE_ART['scan-station'].src).toBe('/game/assets/hub/scan_station.png')
    expect(HUB_STRUCTURE_ART.launchpad.src).toBe('/game/assets/hub/launchpad.png')
  })

  /**
   * The sizes come from `structures.py`'s shared `PX_PER_UNIT`, so they encode
   * the models' real relative footprints. Before KES-260 each model picked its
   * own layout by eye and the scan station rendered nearly as wide as the
   * entire launch complex — a big part of why the base didn't read as one site.
   */
  it('keeps structure sizes in the same ratio as the Blender models', () => {
    const { launchpad, hangar, refinery } = HUB_STRUCTURE_ART
    expect(launchpad.width).toBeGreaterThan(hangar.width)
    expect(hangar.width).toBeGreaterThan(refinery.width)
    expect(HUB_STRUCTURE_ART['scan-station'].width).toBeLessThan(refinery.width)
  })

  it('carries an explicit height so nothing depends on intrinsic image size', () => {
    for (const [kind, art] of Object.entries(HUB_STRUCTURE_ART)) {
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
