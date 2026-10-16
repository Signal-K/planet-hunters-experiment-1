import { describe, expect, it } from 'vitest'
import { PARTS, suggestBuild } from './parts'
import { ROCKET_IDS, ROCKET_MODELS, canonicalRocketId, rocketConfigForModel, rocketModelForConfig } from './rockets'
import { unlockedRocketModels } from '../rockets'

describe('Surveyor, the tier 3 rocket', () => {
  const surveyor = ROCKET_MODELS.find(m => m.id === ROCKET_IDS.surveyor)!

  it('is buyable after six missions and not before', () => {
    expect(surveyor.locked).toBe(false)
    expect(unlockedRocketModels(5).map(m => m.id)).not.toContain('surveyor')
    expect(unlockedRocketModels(6).map(m => m.id)).toContain('surveyor')
  })

  it('matches its tier 3 parts and round-trips through its config', () => {
    const config = rocketConfigForModel(surveyor)
    expect(config).toEqual({ chassis: 'hull-mk3', propulsion: 'ion-a3', drill: 'plasma-t3' })
    expect(rocketModelForConfig(config).id).toBe('surveyor')
    expect(surveyor.stats).toEqual({ cargo: 18, maxOrbit: 9, drillTier: 3 })
  })

  it('opens the tier 3 parts at the same six missions', () => {
    for (const id of ['hull-mk3', 'hull-hauler', 'ion-a3', 'plasma-t3']) {
      const part = [...PARTS.chassis, ...PARTS.propulsion, ...PARTS.drill].find(p => p.id === id)!
      expect(part.locked).toBe(false)
      expect(part.missionsRequired).toBe(6)
    }
  })

  it('maps legacy ids onto it', () => {
    expect(canonicalRocketId('sr3')).toBe('surveyor')
    expect(canonicalRocketId('unannounced-3')).toBe('surveyor')
  })

  it('is suggested for a heavy cargo run once unlocked', () => {
    const build = suggestBuild({ mission: { requires: { cargo_min: 16, drill_tier: 3 } } as never, target: null, missionsDone: 6 })
    expect(build.chassis).toBe('hull-mk3')
  })
})
