import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EARTH_BIOMES } from './base-world'
import { SITES, STRIP_W, groundRuns, homeSite, kitScale, propsFor, validateBaseSite } from './base-site'

describe('base site map', () => {
  it('has no overlaps: sites, structures, props and the apron all fit', () => {
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

  it('starts as natural ground: no apron until the pad is built', () => {
    for (const biome of EARTH_BIOMES) {
      expect(groundRuns(biome, []).map(r => r.style)).toEqual([biome])
      const built = groundRuns(biome, ['launchpad'])
      expect(built.map(r => r.style)).toEqual([biome, 'apron', biome])
      expect(built[0].from).toBe(0)
      expect(built[built.length - 1].to).toBe(STRIP_W)
    }
  })

  it('keeps props natural: rocks and lone pines, never more than one tree per biome screen', () => {
    for (const biome of EARTH_BIOMES) {
      const props = propsFor(biome)
      expect(props.every(p => /^(rock|boulder|pine|snow-rock)/.test(p.sprite))).toBe(true)
      expect(props.filter(p => p.sprite.startsWith('pine')).length).toBeLessThanOrEqual(2)
    }
  })

  it('uses 2 pt per unit on phones and 3 on large screens', () => {
    expect(kitScale({ w: 390, h: 844 })).toBe(2)
    expect(kitScale({ w: 926, h: 428 })).toBe(2)
    expect(kitScale({ w: 1440, h: 900 })).toBe(3)
  })

  it('keeps every site at least 44 pt wide at phone scale', () => {
    for (const s of SITES) expect(s.half * 2 * 2).toBeGreaterThanOrEqual(44)
  })
})
