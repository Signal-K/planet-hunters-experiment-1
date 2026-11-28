import { describe, expect, it } from 'vitest'
import { orbitMesh, requestOrbitPreview, gasGiantPoint, gasGiantRings } from './solarOrbit'
import { previewLandingRequest } from './solarLandingPreview'

describe('orbital terrain handoff', () => {
  it('samples a versioned hemisphere at the same location as the landing', () => {
    const identity = previewLandingRequest('mars')
    const orbit = requestOrbitPreview(json => {
      const { op, solar } = JSON.parse(json)
      expect(op).toBe('solarOrbit')
      expect(solar).toMatchObject({ id: identity.id, seed: identity.seed, styleVersion: identity.styleVersion, latitude: identity.latitude, longitude: identity.longitude })
      return JSON.stringify({ ok: true, value: { bodyId: solar.id, seed: solar.seed, styleVersion: solar.styleVersion, latitude: solar.latitude, longitude: solar.longitude, stepDegrees: solar.step, width: solar.width, height: solar.height, center: { radius: 1, biome: 'rock' }, patch: Array.from({ length: solar.width * solar.height }, () => ({ radius: 1, biome: 'rock' })) } })
    }, 'mars')
    const vertices = orbitMesh(orbit)
    expect(vertices[(orbit.width * orbit.height - 1) / 2]).toMatchObject({ x: 0, y: -0, depth: 1, biome: 'rock' })
    expect(vertices[0].depth).toBeLessThan(0.01)
  })
  it('rejects a mismatched body or invalid samples', () => {
    expect(() => requestOrbitPreview(() => JSON.stringify({ ok: true, value: {} }), 'mars')).toThrow('Invalid Takeon orbital preview')
    expect(() => requestOrbitPreview(json => {
      const { solar } = JSON.parse(json)
      return JSON.stringify({ ok: true, value: { bodyId: solar.id, seed: solar.seed, styleVersion: solar.styleVersion, latitude: solar.latitude, longitude: solar.longitude, stepDegrees: solar.step, width: solar.width, height: solar.height, center: { radius: 1, biome: 'ice' }, patch: Array.from({ length: solar.width * solar.height }, () => ({ radius: 1, biome: 'rock' })) } })
    }, 'mars')).toThrow('Invalid Takeon orbital preview')
  })
})

it('keeps non-gas geometry unchanged and puts Saturn ring arcs in front and behind', () => {
  expect(gasGiantPoint('mars', .2, .3, .4)).toEqual({ x: .2, y: .3, z: .4 })
  const rings = gasGiantRings('saturn')
  expect(rings[1].outer).toBeLessThan(rings[2].inner)
  expect(gasGiantPoint('saturn', 0, 0, rings[0].outer).z).toBeGreaterThan(0)
  expect(gasGiantPoint('saturn', 0, 0, -rings[0].outer).z).toBeLessThan(0)
  expect(gasGiantRings('mars')).toEqual([])
})
