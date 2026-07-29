import { describe, expect, it } from 'vitest'
import { ROCKET_MODELS } from '@/lib/data'
import { getRequiredRocketModel } from './rockets'

describe('getRequiredRocketModel', () => {
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
