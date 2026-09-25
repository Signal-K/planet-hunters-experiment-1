import { describe, expect, it } from 'vitest'
import {
  BIOME_META,
  BIOME_PROFILES,
  biomeIdsForTarget,
  biomeProfileForTarget,
  bloomBiome,
  canSeedBiosphere,
  divisionAt,
  divisionsForTarget,
  estimateEquilibriumTempK,
  habitabilityForTarget,
  lifeStageForTarget,
  LIFE_THRIVE_AFTER_MS,
  sampleSurface,
  type BiomeId,
} from './biomes'

const MARS = { id: 'mars', type: 'planet' as const }
const CANDIDATE = { id: 'exo-toi-700', type: 'exoplanet' as const, archetype: 'S' as const, planetRadiusEarth: 1.1, periodDays: 37, starTeffK: 3480 }
const HOT_JUPITER = { id: 'exo-hot', type: 'exoplanet' as const, archetype: 'gas-giant' as const, planetRadiusEarth: 12, periodDays: 3, starTeffK: 6100 }

describe('biome metadata', () => {
  it('every latent biome blooms into a living biome with higher life capacity', () => {
    for (const meta of Object.values(BIOME_META)) {
      if (!meta.bloomsInto) continue
      const living = BIOME_META[meta.bloomsInto]
      expect(living.lifeCapacity).toBeGreaterThan(meta.lifeCapacity)
    }
  })

  it('every profile band references a known biome', () => {
    for (const profile of BIOME_PROFILES) {
      for (const band of profile.bands) {
        expect(BIOME_META[band.low]).toBeDefined()
        expect(BIOME_META[band.high]).toBeDefined()
      }
    }
  })
})

describe('habitability', () => {
  it('flags Mars as subsurface habitable with terrain constraints', () => {
    const report = habitabilityForTarget(MARS)
    expect(report.habitability).toBe('subsurface')
    expect(report.constraints.some(c => /aquifer/i.test(c))).toBe(true)
  })

  it('accepts a temperate rocky exoplanet and rejects a hot gas giant', () => {
    expect(habitabilityForTarget(CANDIDATE).habitability).toBe('candidate')
    expect(habitabilityForTarget(HOT_JUPITER).habitability).toBe('sterile')
  })

  it('estimates roughly Earth-like equilibrium temperature for an Earth-like orbit', () => {
    const t = estimateEquilibriumTempK(365.25, 5772)
    expect(t).toBeGreaterThan(250)
    expect(t).toBeLessThan(300)
  })
})

describe('life stage', () => {
  it('candidate stays dormant until seeded, then blooms and thrives', () => {
    const now = 10_000_000
    expect(lifeStageForTarget(CANDIDATE, undefined, now)).toBe('dormant')
    expect(lifeStageForTarget(CANDIDATE, { targetId: CANDIDATE.id, seededAt: now - 1000 }, now)).toBe('blooming')
    expect(lifeStageForTarget(CANDIDATE, { targetId: CANDIDATE.id, seededAt: now - LIFE_THRIVE_AFTER_MS }, now)).toBe('thriving')
    expect(lifeStageForTarget(HOT_JUPITER, { targetId: HOT_JUPITER.id, seededAt: 0 }, now)).toBe('sterile')
  })

  it('needs the full tech tree and SETI programme to seed', () => {
    expect(canSeedBiosphere({ techTreeComplete: true, setiComplete: true }, 'candidate')).toBe(true)
    expect(canSeedBiosphere({ techTreeComplete: false, setiComplete: true }, 'candidate')).toBe(false)
    expect(canSeedBiosphere({ techTreeComplete: true, setiComplete: true }, 'sterile')).toBe(false)
  })

  it('never shows a bloomed biome while dormant', () => {
    expect(bloomBiome('tidal-flats', 'dormant', 1)).toBe('tidal-flats')
    expect(bloomBiome('tidal-flats', 'thriving', 0)).toBe('coral-shallows')
    const dormant = new Set(biomeIdsForTarget(CANDIDATE, 'dormant'))
    expect(dormant.has('coral-shallows')).toBe(false)
    const thriving = new Set(biomeIdsForTarget(CANDIDATE, 'thriving'))
    expect([...thriving].some(id => BIOME_META[id].lifeCapacity >= 2)).toBe(true)
  })
})

describe('surface sampling', () => {
  it('is deterministic for a target and point', () => {
    const a = sampleSurface(MARS, 0.4, 1.2)
    const b = sampleSurface(MARS, 0.4, 1.2)
    expect(a).toEqual(b)
  })

  it('gives Mars its cold desert palette and a red dwarf candidate its own', () => {
    expect(biomeProfileForTarget(MARS).id).toBe('mars')
    expect(biomeProfileForTarget(CANDIDATE).id).toBe('red-dwarf-candidate')
  })

  it('produces more than one biome per body', () => {
    const seen = new Set<BiomeId>()
    for (let i = 0; i < 24; i++) seen.add(sampleSurface(MARS, -1.4 + i * 0.12, i * 0.5).biome)
    expect(seen.size).toBeGreaterThan(2)
  })
})

describe('divisions', () => {
  it('cuts a body into a 2x4 grid with dominant biomes', () => {
    const divisions = divisionsForTarget(MARS)
    expect(divisions).toHaveLength(8)
    expect(divisions[0].id).toBe('mars:0-0')
    expect(divisions.every(d => d.biomeMix.length > 0)).toBe(true)
  })

  it('maps lat/lon to the containing division', () => {
    expect(divisionAt('mars', -1, -3)).toBe('mars:0-0')
    expect(divisionAt('mars', 1, 3)).toBe('mars:1-3')
  })
})
