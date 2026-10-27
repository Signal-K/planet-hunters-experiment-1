import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EARTH_BIOMES } from './base-world'
import { GROUND, SITES, STRIP_W, backdropFor, displaySite, homeCenter, homeSite, kitScale, siteById, validateBaseSite } from './base-site'

describe('base site map', () => {
  it('has no overlaps: sites and structures fit the strip', () => {
    expect(validateBaseSite()).toEqual([])
  })

  it('matches the shared source native bundles', () => {
    const shared = JSON.parse(readFileSync(join(process.cwd(), '../shared/layout/base-site.json'), 'utf8'))
    const copy = JSON.parse(readFileSync(join(process.cwd(), 'lib/scene/base-site.json'), 'utf8'))
    expect(copy).toEqual(shared)
  })

  it('gives every drawn structure exactly one home site', () => {
    expect(homeSite('launchpad')?.id).toBe('pad')
    expect(homeSite('hangar')?.id).toBe('hall')
    expect(homeSite('garage')?.id).toBe('hall')
    expect(homeSite('market')?.id).toBe('exchange')
    expect(homeSite('surface-silo')?.id).toBe('shaft')
    expect(homeSite('refinery')).toBeNull()
  })

  it('is a paved complex on flat land: one ground under the whole strip, one flat far ground per biome', () => {
    expect(GROUND.left).toBeLessThanOrEqual(0)
    expect(GROUND.left + GROUND.width).toBeGreaterThanOrEqual(STRIP_W)
    for (const biome of EARTH_BIOMES) {
      const bands = backdropFor(biome)
      expect(bands.map(b => b.id)).toEqual(['plain'])
      // The far ground starts behind the paving and stays low: a horizon, never a mountain range.
      expect(bands[0].bottom).toBeLessThanOrEqual(GROUND.above)
      expect(bands[0].bottom + bands[0].height).toBeLessThan(70)
    }
  })

  it('fits the complete strip across a landscape view while preserving the portrait fit', () => {
    expect(kitScale({ w: 390, h: 844 })).toBe(1.56)
    expect(kitScale({ w: 926, h: 428 })).toBe(1.78)
    expect(kitScale({ w: 1440, h: 900 })).toBe(2.77)
  })

  it('frames what is built: the pad site on a fresh base, hangar and pad whole on every phone', () => {
    expect(homeCenter([], 195)).toBe(displaySite(siteById('pad')).x)
    for (const view of [{ w: 390, h: 844 }, { w: 926, h: 428 }, { w: 1440, h: 900 }]) {
      const units = view.w / kitScale(view)
      const c = homeCenter(['hangar', 'launchpad'], units)
      const hall = siteById('hall')
      const pad = siteById('pad')
      expect(c - units / 2).toBeLessThanOrEqual(hall.x - hall.half)
      expect(c + units / 2).toBeGreaterThanOrEqual(pad.x + pad.half)
    }
  })

  it('keeps every site at least 44 pt wide at phone scale', () => {
    for (const s of SITES) expect(s.half * 2 * 2).toBeGreaterThanOrEqual(44)
  })
})
