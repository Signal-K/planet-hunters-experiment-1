import { describe, expect, it } from 'vitest'
import { STARTER_ROCKETS } from '@/lib/data'
import { getRequiredStarterRocket } from './rockets'

describe('getRequiredStarterRocket', () => {
  it('returns the starter vehicle before later tiers unlock', () => {
    const rocket = getRequiredStarterRocket(0)

    expect(rocket.locked).toBe(false)
    expect(rocket.missionsRequired).toBeLessThanOrEqual(0)
  })

  it('returns the highest-tier unlocked vehicle for current progression', () => {
    const missionsDone = Math.max(...STARTER_ROCKETS.map(rocket => rocket.missionsRequired))
    const expectedTier = Math.max(
      ...STARTER_ROCKETS
        .filter(rocket => !rocket.locked && rocket.missionsRequired <= missionsDone)
        .map(rocket => rocket.tier),
    )

    expect(getRequiredStarterRocket(missionsDone).tier).toBe(expectedTier)
  })
})
