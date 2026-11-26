import { describe, expect, it } from 'vitest'
import { moonParent } from './solar-moons'
import { TARGETS } from './data/targets'
import { supportsSolarField, solarField } from './takeon/solarField'
import { biomeProfileForTarget } from './data/biomes'
import { terrainLookForTarget } from './takeon/terrainColour'

describe('solar moon parents', () => {
  it('places known moons under their planets without treating planets as moons', () => {
    expect(moonParent('europa')).toBe('jupiter')
    expect(moonParent('moon')).toBe('earth')
    expect(moonParent('titan')).toBe('saturn')
    expect(moonParent('mars')).toBeUndefined()
    expect(moonParent('ceres')).toBeUndefined()
  })
  it('uses moon climates for surface fields instead of a generic planetary climate', () => {
    const temperatures: Record<string, number> = {
      ganymede: -160, callisto: -140, enceladus: -200, mimas: -200,
      tethys: -187, dione: -186, rhea: -174, iapetus: -143,
      miranda: -187, ariel: -203, umbriel: -198, titania: -203,
      oberon: -203, triton: -235,
    }
    for (const [id, temperature] of Object.entries(temperatures)) {
      const target = TARGETS.find(body => body.id === id)!
      expect(biomeProfileForTarget(target).temperature, id).toBe(temperature)
      expect(terrainLookForTarget(target).atmosphere, id).toBe('none')
    }
    expect(terrainLookForTarget(TARGETS.find(body => body.id === 'titan')!).atmosphere).toBe('thick')
  })
  it('catalogs each currently supported Takeon moon under its parent with a surface allocation', () => {
    for (const id of ['moon', 'phobos', 'deimos', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'enceladus', 'mimas', 'tethys', 'dione', 'rhea', 'iapetus', 'miranda', 'ariel', 'umbriel', 'titania', 'oberon', 'triton']) {
      const target = TARGETS.find(body => body.id === id)
      expect(target, id).toBeDefined()
      expect(moonParent(id), id).toBeDefined()
      expect(supportsSolarField(id), id).toBe(true)
      const materials: number[] = []
      solarField({ bodyId: id, seed: 1, styleVersion: 1, latitude: 0, longitude: 0, stepDegrees: 1, width: 1, height: 1, center: { radius: 1, biome: 'ice' }, patch: [{ radius: 1, biome: 'ice' }] }, ['#aabbcc', '#8899aa', '#556677'], def => materials.push(def.id))
      expect(materials.every(material => material > 0 && material <= 255), id).toBe(true)
    }
  })
})
