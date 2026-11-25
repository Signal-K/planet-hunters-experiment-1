import { describe, expect, it } from 'vitest'
import { landingDem, landingTerrain, previewLandingRequest, requestLandingPreview } from './solarLandingPreview'

describe('experimental solar landing connection', () => {
  it('requests the actual destination and a stable versioned identity', () => {
    const identity = previewLandingRequest('vesta')
    expect(identity).toEqual(previewLandingRequest('vesta'))
    expect(identity.id).toBe('vesta')
    expect(identity.seed).not.toBe(previewLandingRequest('mars').seed)
    const transport = (json: string) => {
      expect(JSON.parse(json)).toEqual({ op: 'solarLanding', solar: identity })
      return JSON.stringify({ ok: true, value: { bodyId: identity.id, seed: identity.seed, styleVersion: 1, width: 81, height: 81, latitude: 0, longitude: 0, stepDegrees: 0.08, center: { radius: 1, biome: 'regolith' }, patch: Array.from({ length: 81 * 81 }, () => ({ radius: 1, biome: 'regolith' })) } })
    }
    expect(requestLandingPreview(transport, 'vesta').bodyId).toBe('vesta')
  })
  it('rejects errors and incomplete or mismatched terrain', () => {
    expect(() => requestLandingPreview(() => JSON.stringify({ ok: false, error: 'unknown body' }), 'ceres')).toThrow('unknown body')
    expect(() => requestLandingPreview(() => JSON.stringify({ ok: true, value: {} }), 'mars')).toThrow('Invalid Takeon landing preview')
  })
  it('turns the shared patch into a finite, ordered rover elevation grid', () => {
    const landing = { bodyId: 'mars', seed: 2, styleVersion: 1, latitude: 0, longitude: 0, stepDegrees: 0.08, width: 2, height: 2, center: { radius: 1, biome: 'regolith' }, patch: [1, 2, 3, 5].map(radius => ({ radius, biome: 'regolith' })) }
    expect(landingDem(landing).heights).toEqual([0, 0.25, 0.5, 1])
    expect(landingDem({ ...landing, patch: landing.patch.map(() => ({ radius: 1, biome: 'ice' })) }).heights).toEqual([0.5, 0.5, 0.5, 0.5])
    expect(landingTerrain({ ...landing, patch: landing.patch.map((point, index) => ({ ...point, biome: index < 2 ? 'rock' : 'ice' })) }, { rock: 2, ice: 4 }).surfaceMaterials).toEqual([2, 2, 4, 4])
    expect(() => landingTerrain(landing, {})).toThrow('No surface material for solar biome regolith')
  })
  it('keeps legacy coordinates and gives each saved zone a stable longitude', () => {
    expect(previewLandingRequest('mars')).toEqual(previewLandingRequest('mars', 'prime'))
    expect(['prime', 'east', 'opposite', 'west'].map(zone => previewLandingRequest('mars', zone as 'prime' | 'east' | 'opposite' | 'west').longitude)).toEqual([0, 90, 180, -90])
    const identity = previewLandingRequest('mars', 'east')
    const result = requestLandingPreview(json => {
      const { solar } = JSON.parse(json)
      expect(solar).toEqual(identity)
      return JSON.stringify({ ok: true, value: { bodyId: solar.id, seed: solar.seed, styleVersion: solar.styleVersion, latitude: solar.latitude, longitude: solar.longitude, stepDegrees: solar.step, width: solar.width, height: solar.height, center: { radius: 1, biome: 'rock' }, patch: Array.from({ length: solar.width * solar.height }, () => ({ radius: 1, biome: 'rock' })) } })
    }, 'mars', 'east')
    expect(result.longitude).toBe(90)
  })
})
