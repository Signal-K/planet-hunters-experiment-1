import { describe, expect, it } from 'vitest'
import { EARTH_BASE_STRUCTURE_SIZES } from './HubScreen'
import { sceneXPercent } from '@/lib/scene/terrain-kit'

describe('Earth Base module composition', () => {
  it('uses one authored X conversion for structure art and status labels', () => {
    const launchpadWidthPct = EARTH_BASE_STRUCTURE_SIZES.launchpad.width / 6.4
    const hangarWidthPct = EARTH_BASE_STRUCTURE_SIZES.hangar.width / 6.4
    expect(sceneXPercent(60, launchpadWidthPct)).toBeCloseTo(launchpadWidthPct / 2)
    expect(sceneXPercent(342, hangarWidthPct)).toBeCloseTo(100 - hangarWidthPct / 2)
  })
  it('keeps a site-scale footprint for the composited launchpad and hangar', () => {
    expect(EARTH_BASE_STRUCTURE_SIZES.launchpad.width).toBe(360)
    expect(EARTH_BASE_STRUCTURE_SIZES.hangar.width).toBe(360)
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

  it('keeps service-road paths below the facility contact line', async () => {
    const { EARTH_BASE_WIDE, EARTH_BASE_PAD } = await import('@/lib/scene/compositions')
    const wideRoad = EARTH_BASE_WIDE.roadPaths?.[0]
    const padRoad = EARTH_BASE_PAD.roadPaths?.[0]
    expect(wideRoad?.points.every(point => point.groundOffset < 0)).toBe(true)
    expect(padRoad?.points.every(point => point.groundOffset < 0)).toBe(true)
    expect(EARTH_BASE_WIDE.bands.find(band => band.id === 'ground-detail')?.baseline)
      .toBe('calc(var(--hub-ground) - 4.5%)')
    expect(EARTH_BASE_PAD.bands.find(band => band.id === 'ground-detail')?.baseline)
      .toBe('calc(var(--hub-ground) - 7%)')
    for (const composition of [EARTH_BASE_WIDE, EARTH_BASE_PAD]) {
      const detail = composition.bands.find(band => band.id === 'ground-detail')
      expect(detail?.bricks.some(({ brick }) => brick === 'road_segment' || brick === 'road_ramp')).toBe(false)
      expect(composition.bands.some(band => band.bricks.some(({ brick }) => brick === 'ground_apron'))).toBe(false)
    }
  })
})
