import { describe, expect, it } from 'vitest'
import type { Player } from '@/lib/game-types'
import { claimResearchReward, traderSteps } from './paths'

describe('community research paths', () => {
  it('defines the Trader chain with the Exchange actions', () => {
    expect(traderSteps({ eventName: null }).map(step => step.kind)).toEqual([
      'exchange-sale', 'contract-run', 'price-alert', 'exchange-sale', 'contract-run',
    ])
  })

  it('grants each weekly reward once and keeps the permanent badge', () => {
    const player: Pick<Player, 'researchPath' | 'researchFragments' | 'badges'> = { researchPath: { week: '2026-10-19', path: 'trader' } }
    const stepTwo = traderSteps({ eventName: null })[1]
    const first = claimResearchReward(player, stepTwo, { have: 1, need: 1 }, 10)
    expect(first.researchFragments).toBe(5)
    expect(first.researchPath?.claimedSteps).toEqual([2])
    expect(claimResearchReward(first, stepTwo, { have: 1, need: 1 }, 20)).toBe(first)

    const breakthrough = traderSteps({ eventName: null })[4]
    const finished = claimResearchReward(first, breakthrough, { have: 1, need: 1 }, 30)
    expect(finished.researchFragments).toBe(30)
    expect(finished.researchPath?.claimedSteps).toEqual([2, 5])
    expect(finished.badges?.['community-research-2026-10-19']).toMatchObject({ tier: 'gold' })
  })
})
