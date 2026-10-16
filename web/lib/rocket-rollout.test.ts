import { describe, expect, it } from 'vitest'
import { consumeRocketRolloutPending, kitRocketBuilt, markRocketRolloutPending, rolloutFrame, ROLLOUT_FRAMES } from './rocket-rollout'

describe('rocket rollout', () => {
  it('keeps the pad empty until the four workshop stages are fitted', () => {
    expect(kitRocketBuilt(null)).toBe(false)
    expect(kitRocketBuilt({ engine: 'ion-thruster-t1' })).toBe(false)
    expect(kitRocketBuilt({
      engine: 'ion-thruster-t1',
      booster: 'strap-booster-t1',
      cockpit: 'cockpit-command-t1',
      payload: 'mining-payload-t1',
    })).toBe(true)
  })

  it('rolls from the hangar along the ground, then settles on the slab', () => {
    const first = rolloutFrame(0)
    const last = rolloutFrame(ROLLOUT_FRAMES - 1)
    expect(first.t).toBe(0)
    expect(first.lift).toBe(0)
    expect(first.pose).toBe('roll')
    expect(last.t).toBe(1)
    expect(last.lift).toBe(1)
    expect(last.pose).toBe('set')
    expect(last.w).toBe(44)
    const travel = Array.from({ length: 5 }, (_, i) => rolloutFrame(i).t)
    expect(travel[0]).toBeLessThan(travel[4])
    for (let i = 0; i < 6; i++) expect(rolloutFrame(i).lift).toBe(0)
  })

  it('plays the rollout once, the next time the base is shown', () => {
    expect(consumeRocketRolloutPending()).toBe(false)
    markRocketRolloutPending()
    expect(consumeRocketRolloutPending()).toBe(true)
    expect(consumeRocketRolloutPending()).toBe(false)
  })
})
