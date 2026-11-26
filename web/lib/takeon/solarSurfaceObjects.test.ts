import { describe, expect, it } from 'vitest'
import { solarSurfaceObjects } from './solarSurfaceObjects'
import type { SolarLandingPreview } from './solarLandingPreview'

const sample: SolarLandingPreview = { bodyId: 'europa', seed: 42, styleVersion: 1, latitude: 0, longitude: 0, stepDegrees: 0.08, width: 81, height: 81, center: { radius: 1, biome: 'icefield' }, patch: Array.from({ length: 81 * 81 }, () => ({ radius: 1, biome: 'icefield' })) }

describe('solar surface detail', () => {
  it('is stable for a landing site and distinguishes ice from rock', () => {
    const ice = solarSurfaceObjects(sample)
    expect(ice.length).toBeGreaterThan(0)
    expect(solarSurfaceObjects(sample)).toEqual(ice)
    expect(ice.every(object => object.kind === 'ice')).toBe(true)
    expect(solarSurfaceObjects({ ...sample, longitude: 90 })).not.toEqual(ice)
    expect(solarSurfaceObjects({ ...sample, patch: sample.patch.map(point => ({ ...point, biome: 'regolith' })) }).every(object => object.kind === 'rock')).toBe(true)
  })
  it('does not scatter solid objects on ocean or methane lakes', () => {
    for (const biome of ['ocean', 'methane-lakes']) expect(solarSurfaceObjects({ ...sample, patch: sample.patch.map(point => ({ ...point, biome })) })).toEqual([])
  })
})
