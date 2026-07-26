import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { applyTutorialSkip } from '@/lib/tutorial-skip'

const baseState: GameState = {
  screen: 'build',
  player: {
    francs: 10_000_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: [],
    placementPlots: {},
    controlBuilt: false,
    missionsDone: 0,
    skillPoints: 0,
    unlockedSkillNodes: [],
    freeOperations: false,
    clientMissions: {},
    clientStreaks: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryUnlocked: false,
    refineryUnlockNotified: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    seen_planets: [],
    roverDeployments: [],
    clientTerritories: {},
  },
  missionId: null,
  targetId: null,
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
  tutorial: true,
  doneSteps: {},
  popup: null,
  menuOpen: true,
}

describe('applyTutorialSkip', () => {
  it('leaves brand-new players with a launchpad and a usable hub', () => {
    const next = applyTutorialSkip(baseState, [0, 1, 2])

    expect(next.tutorial).toBe(false)
    expect(next.menuOpen).toBe(false)
    expect(next.screen).toBe('hub')
    expect(next.player.placed).toContain('launchpad')
    expect(next.player.placementPlots.launchpad).toBe(1)
    expect(next.doneSteps).toMatchObject({ 0: true, 1: true, 2: true })
  })

  it('does not duplicate an existing launchpad', () => {
    const next = applyTutorialSkip({
      ...baseState,
      screen: 'hub',
      player: {
        ...baseState.player,
        placed: ['launchpad'],
        placementPlots: { launchpad: 3 },
      },
    }, [0])

    expect(next.screen).toBe('hub')
    expect(next.player.placed).toEqual(['launchpad'])
    expect(next.player.placementPlots.launchpad).toBe(3)
  })
})
