import { describe, expect, it } from 'vitest'
import { normalizeState } from '@/lib/game-state'
import {
  biomeLayers,
  biomeGround,
  exchangeAnchorX,
  exchangeSeat,
  lockBaseWorldPreview,
  lockedSeason,
  lockedWorldTime,
  sanitizeEarthBiome,
  coarseSkyPhase,
  sanitizeSeason,
  sanitizeWorldTime,
  seasonForMonth,
  structureAnchorPercent,
  structureTier,
  structureTierScale,
  worldTimeForHour,
  worldTimeGrade,
} from './base-world'

describe('base world layers', () => {
  it('ships distinct skyline and ground layers for all four base biomes', () => {
    expect(biomeLayers('mountains').map(layer => layer.id)).toEqual(['far', 'hills'])
    expect(biomeLayers('desert').map(layer => layer.id)).toEqual(['far'])
    expect(biomeLayers('tundra').map(layer => layer.src)).toEqual(['/game/assets/biomes/tundra/layer-far.png'])
    expect(biomeLayers('coast').map(layer => layer.src)).toEqual(['/game/assets/biomes/coast/layer-far.png'])
    expect(biomeGround('tundra')).toBe('/game/assets/biomes/tundra/layer-ground.png')
    expect(biomeGround('coast')).toBe('/game/assets/biomes/coast/layer-ground.png')
    expect(biomeLayers('mountains').map(layer => layer.src)).toEqual([
      '/game/assets/base/layers/mountains-far.png',
      '/game/assets/base/layers/mountains-mid.png',
    ])
  })

  it('maps the year onto four seasons and the clock onto day, dusk and night', () => {
    expect(seasonForMonth(0)).toBe('winter')
    expect(seasonForMonth(3)).toBe('spring')
    expect(seasonForMonth(6)).toBe('summer')
    expect(seasonForMonth(9)).toBe('autumn')
    expect(seasonForMonth(11)).toBe('winter')
    expect(worldTimeForHour(4)).toBe('night')
    expect(worldTimeForHour(5)).toBe('dawn')
    expect(worldTimeForHour(8)).toBe('morning')
    expect(worldTimeForHour(11)).toBe('midday')
    expect(worldTimeForHour(14)).toBe('afternoon')
    expect(worldTimeForHour(17)).toBe('dusk')
    expect(worldTimeForHour(20)).toBe('night')
    expect(worldTimeForHour(23)).toBe('night')
    expect(worldTimeGrade('dawn')).toBe('dawn')
    expect(worldTimeGrade('day')).toBe('midday')
    expect(worldTimeGrade('dusk')).toBe('dusk')
    expect(worldTimeGrade('night')).toBe('night')
    expect(coarseSkyPhase('morning')).toBe('day')
    expect(coarseSkyPhase('midday')).toBe('day')
    expect(coarseSkyPhase('afternoon')).toBe('day')
    expect(sanitizeWorldTime('night')).toBe('night')
    expect(sanitizeWorldTime('day')).toBe('midday')
    expect(sanitizeWorldTime('noon')).toBeNull()
    expect(sanitizeSeason('winter')).toBe('winter')
    expect(sanitizeSeason('fall')).toBeNull()
    lockBaseWorldPreview(new URLSearchParams('time=night&season=winter'))
    expect(lockedWorldTime()).toBe('night')
    expect(lockedSeason()).toBe('winter')
    lockBaseWorldPreview(new URLSearchParams())
    expect(lockedWorldTime()).toBeNull()
    expect(lockedSeason()).toBeNull()
  })

  it('keeps a chosen biome through save normalisation and rejects unknown values', () => {
    expect(sanitizeEarthBiome('desert')).toBe('desert')
    expect(sanitizeEarthBiome('marsh')).toBe('mountains')
    const state = normalizeState({ player: { earthBiome: 'desert', francs: 10 } })
    expect(state.player.earthBiome).toBe('desert')
    expect(normalizeState({ player: { earthBiome: 'volcano' as 'desert' } }).player.earthBiome).toBe('mountains')
  })

  it('anchors starter structures to the approved base and leaves other kinds on their plot', () => {
    expect(structureAnchorPercent('hangar')).toBe(12)
    expect(structureAnchorPercent('launchpad')).toBe(52)
    expect(structureAnchorPercent('command')).toBeNull()
    expect(structureAnchorPercent('refinery')).toBeNull()
    expect(structureAnchorPercent('astronaut-academy')).toBeNull()
    expect(structureAnchorPercent('surface-silo')).toBeNull()
  })

  it('places the Exchange in the widest gap and grows buildings by tier', () => {
    expect(exchangeAnchorX([60])).toBeCloseTo(301.5)
    expect(exchangeAnchorX([])).toBeCloseTo(100.5)
    const full = exchangeSeat([
      { x: 60, half: 12 },
      { x: 154, half: 30 },
      { x: 248, half: 29 },
      { x: 342, half: 38 },
    ], 25)
    expect(full).toBeGreaterThan(60 + 12 + 25)
    expect(full).toBeLessThan(154 - 30 - 25)
    expect(exchangeSeat([{ x: 60, half: 21 }], 25)).toBeGreaterThan(201)
    expect(structureTier(1)).toBe(1)
    expect(structureTier(2)).toBe(2)
    expect(structureTier(4)).toBe(3)
    expect(structureTierScale(1)).toBeLessThan(structureTierScale(2))
    expect(structureTierScale(2)).toBeLessThan(structureTierScale(3))
  })
})
