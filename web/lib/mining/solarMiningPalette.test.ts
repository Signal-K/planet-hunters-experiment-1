import { describe, expect, it } from 'vitest'
import { STATIC_CATALOG } from '@/lib/catalog'
import type { SolarLandingPreview } from '@/lib/takeon/solarLandingPreview'
import { solarBiomeColour } from '@/lib/takeon/solarBiomeColour'
import { terrainLookForTarget } from '@/lib/takeon/terrainColour'
import { paletteForTarget } from './laserPalette'
import { solarMiningPalette } from './solarMiningPalette'

describe('selected mining site', () => {
  const target = STATIC_CATALOG.targets.find(body => body.id === 'mars')!
  const landing = { bodyId: 'mars', center: { radius: 1, biome: 'ice' } } as SolarLandingPreview
  it('uses the same centre biome colour as the orbital surface', () => {
    const base = paletteForTarget(target)
    const result = solarMiningPalette(base, target, landing)
    const colour = solarBiomeColour('ice', terrainLookForTarget(target).ground)
    expect(result.ground).toBe(parseInt(colour.slice(1), 16))
    expect(result.landscape?.tint).toBe(colour)
    expect(base).toEqual(paletteForTarget(target))
  })
  it('rejects a sample from another body', () => {
    expect(() => solarMiningPalette(paletteForTarget(target), target, { ...landing, bodyId: 'europa' })).toThrow()
  })
})
