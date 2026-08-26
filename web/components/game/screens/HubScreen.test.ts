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
