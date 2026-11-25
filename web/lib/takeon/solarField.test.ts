import { describe, expect, it } from 'vitest'
import { solarField } from './solarField'
import { solarBiomeColour } from './solarBiomeColour'
import type { SolarLandingPreview } from './solarLandingPreview'

const ground = ['#aabbcc', '#8899aa', '#556677'] as const
const sample: SolarLandingPreview = { bodyId: 'mars', seed: 1, styleVersion: 1, latitude: 0, longitude: 0, stepDegrees: 1, width: 2, height: 2, center: { radius: 1, biome: 'red-desert' }, patch: [{ radius: 1, biome: 'red-desert' }, { radius: 2, biome: 'ice' }, { radius: 3, biome: 'highlands' }, { radius: 4, biome: 'volcanic-highlands' }] }

describe('solar field material handoff', () => {
  it('preserves each sampled biome and elevation in matching grid order', () => {
    const materials = new Map<number, string>()
    const field = solarField(sample, ground, material => { materials.set(material.id, material.colors[0]) })
    expect(field.heights).toEqual([0, 1 / 3, 2 / 3, 1])
    expect(field.surfaceMaterials.map(id => materials.get(id))).toEqual(sample.patch.map(point => solarBiomeColour(point.biome, ground)))
    expect(new Set(field.surfaceMaterials).size).toBe(4)
  })
  it('does not silently invent a mapping for unsupported bodies or biomes', () => {
    expect(() => solarField({ ...sample, bodyId: 'unknown' }, ground, () => {})).toThrow('No solar field material allocation')
    expect(() => solarField({ ...sample, patch: [{ radius: 1, biome: 'unknown' }] }, ground, () => {})).toThrow('No surface material')
  })
})
