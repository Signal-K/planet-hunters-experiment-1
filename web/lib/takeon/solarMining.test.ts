import { describe, expect, it } from 'vitest'
import { getBody, type MaterialDef } from '@takeon/engine'
import { MINERAL_META } from '@/lib/data/minerals'
import { mineralFromSolarResource, registerSolarMiningMaterials, solarMiningBody, solarMiningResource, SOLAR_MINING_MATERIALS } from './solarMining'

describe('solar mining material bridge', () => {
  it('keeps each normal Landnam mineral distinct and outside the solar biome palette', () => {
    const definitions: MaterialDef[] = []
    registerSolarMiningMaterials(def => definitions.push(def))
    expect(new Set(definitions.map(def => def.id)).size).toBe(definitions.length)
    expect(definitions.every(def => def.id >= 32 && def.id < 64)).toBe(true)
    for (const [id, material] of Object.entries(SOLAR_MINING_MATERIALS)) {
      expect(MINERAL_META[id]).toBeDefined()
      expect(definitions.find(def => def.id === material)?.yields?.resource).toBe(solarMiningResource(id))
      expect(mineralFromSolarResource(solarMiningResource(id))).toBe(id)
    }
    expect(mineralFromSolarResource('crystal')).toBeNull()
  })

  it('uses the destination composition independent of the current mission', () => {
    const body = getBody('mars')!
    const configured = solarMiningBody(body, ['iron', 'platinum', 'iron'])
    expect(Object.keys(configured.terrain.bands![0].minerals).sort()).toEqual([
      String(SOLAR_MINING_MATERIALS.iron), String(SOLAR_MINING_MATERIALS.platinum),
    ].sort())
    expect(() => solarMiningBody(body, ['unmapped'])).toThrow()
  })
})
