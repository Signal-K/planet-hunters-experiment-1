import { describe, expect, it } from 'vitest'
import { ROCKET_MODELS, ROCKET_IDS, canonicalRocketId, rocketConfigForModel } from '@/lib/data'
import { getRequiredRocketModel } from './rockets'

describe('getRequiredRocketModel', () => {
  it('uses canonical runtime ids and resolves legacy ids only at the compatibility boundary', () => {
    expect(ROCKET_MODELS.slice(0, 2).map(rocket => rocket.id)).toEqual([ROCKET_IDS.explorer, ROCKET_IDS.prospector])
    expect(ROCKET_MODELS.some(rocket => /^sr\d$/.test(rocket.id))).toBe(false)
    expect(canonicalRocketId('sr1')).toBe(ROCKET_IDS.explorer)
    expect(canonicalRocketId('sr2')).toBe(ROCKET_IDS.prospector)
    expect(canonicalRocketId(ROCKET_IDS.explorer)).toBe(ROCKET_IDS.explorer)
  })

  it('returns the starter vehicle before later tiers unlock', () => {
    const rocket = getRequiredRocketModel(0)

    expect(rocket.locked).toBe(false)
    expect(rocket.missionsRequired).toBeLessThanOrEqual(0)
  })

  it('returns the highest-tier unlocked vehicle for current progression', () => {
    const missionsDone = Math.max(...ROCKET_MODELS.map(rocket => rocket.missionsRequired))
    const expectedTier = Math.max(
      ...ROCKET_MODELS
        .filter(rocket => !rocket.locked && rocket.missionsRequired <= missionsDone)
        .map(rocket => rocket.tier),
    )

    expect(getRequiredRocketModel(missionsDone).tier).toBe(expectedTier)
  })
})

describe('rocketConfigForModel', () => {
  it('maps the selectable model names to their canonical unibody loadouts', () => {
    expect(rocketConfigForModel(ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.explorer))).toEqual({
      chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill',
    })
    expect(rocketConfigForModel(ROCKET_MODELS.find(rocket => rocket.id === ROCKET_IDS.prospector))).toEqual({
      chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2',
    })
  })
})
