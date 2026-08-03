import { describe, expect, it } from 'vitest'
import { LANDING_RESEARCH_XP_COST } from '@/lib/data'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { GameState, Player } from '@/lib/game-types'
import {
  applyLandingTouchdown,
  applyRedockComplete,
  applyResearchLanding,
  landingProgress,
} from './LandingSystem'

function game(player: Partial<Player> = {}, overrides: Partial<GameState> = {}): GameState {
  return {
    ...DEFAULT_STATE,
    player: {
      ...DEFAULT_STATE.player,
      francs: 100_000_000,
      freeOperations: true,
      missionsDone: 2,
      ...player,
    },
    ...overrides,
  }
}

describe('landingProgress', () => {
  it('is 0 with no start time and clamps to [0,1]', () => {
    expect(landingProgress(undefined)).toBe(0)
    expect(landingProgress(1000, 1000, 8000)).toBe(0)
    expect(landingProgress(1000, 5000, 8000)).toBeCloseTo(0.5)
    expect(landingProgress(1000, 20000, 8000)).toBe(1)
  })
})

describe('applyResearchLanding', () => {
  it('requires missionsDone >= 2 and enough researchXP, then flips the flag and spends XP', () => {
    const tooEarly = applyResearchLanding(game({ missionsDone: 1, researchXP: LANDING_RESEARCH_XP_COST }))
    expect(tooEarly.player.landingResearched).toBeFalsy()

    const tooPoor = applyResearchLanding(game({ researchXP: LANDING_RESEARCH_XP_COST - 1 }))
    expect(tooPoor.player.landingResearched).toBeFalsy()

    const researched = applyResearchLanding(game({ researchXP: LANDING_RESEARCH_XP_COST }))
    expect(researched.player.landingResearched).toBe(true)
    expect(researched.player.researchXP).toBe(0)
  })

  it('is a no-op once already researched', () => {
    const state = game({ landingResearched: true, researchXP: LANDING_RESEARCH_XP_COST })
    expect(applyResearchLanding(state)).toBe(state)
  })
})

describe('applyLandingTouchdown', () => {
  it('moves to mining and sets hasLanded, only while on the landing screen mid-descent', () => {
    const state = game(
      { landingStartedAt: Date.now(), missionPhase: 'landing' },
      { screen: 'landing' },
    )
    const result = applyLandingTouchdown(state)
    expect(result.screen).toBe('mining')
    expect(result.player.missionPhase).toBe('mining')
    expect(result.player.hasLanded).toBe(true)
    expect(result.player.landingStartedAt).toBeUndefined()
  })

  it('is a no-op off the landing screen or without a descent in progress', () => {
    const wrongScreen = game({ landingStartedAt: Date.now() }, { screen: 'mining' })
    expect(applyLandingTouchdown(wrongScreen)).toBe(wrongScreen)

    const noDescent = game({}, { screen: 'landing' })
    expect(applyLandingTouchdown(noDescent)).toBe(noDescent)
  })
})

describe('applyRedockComplete', () => {
  it('starts the return leg once ascent is in progress on the landing screen', () => {
    const state = game(
      { landingReturnStartedAt: Date.now(), hasLanded: true },
      { screen: 'landing', missionId: 'm1', targetId: 't1', deliveryTargetId: null },
    )
    const result = applyRedockComplete(state, { iron: 3 }, null, null)
    expect(result.screen).toBe('transit')
    expect(result.lastCargo).toEqual({ iron: 3 })
    expect(result.player.landingReturnStartedAt).toBeUndefined()
    expect(result.player.returningToEarth).toBe(true)
  })

  it('is a no-op without an ascent in progress', () => {
    const state = game({}, { screen: 'landing', missionId: 'm1', targetId: 't1' })
    expect(applyRedockComplete(state, {}, null, null)).toBe(state)
  })
})
