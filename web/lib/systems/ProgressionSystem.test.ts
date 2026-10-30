import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { MISSIONS } from '@/lib/data'
import {
  applyGainResearchXP,
  applyAbandonMission,
  applyUnlockBlueprint,
} from './ProgressionSystem'

type GameStateOverrides = Omit<Partial<GameState>, 'player'> & {
  player?: Partial<GameState['player']>
}

function makeState(overrides: GameStateOverrides = {}): GameState {
  const base: GameState = {
    screen: 'hub',
    player: {
      francs: 1_000,
      activeMission: null,
      missionCount: 1,
      pendingLaunch: false,
      placed: [],
      placementPlots: {},
      controlBuilt: false,
      missionsDone: 0,
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
      researchXP: 0,
      unlockedBlueprints: [],
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  }

  return {
    ...base,
    ...overrides,
    player: {
      ...base.player,
      ...overrides.player,
    },
  }
}

describe('research progression', () => {
  it('adds floored positive Research XP and ignores invalid gains', () => {
    const gained = applyGainResearchXP(makeState(), 12.8)
    expect(gained.player.researchXP).toBe(12)

    const unchanged = applyGainResearchXP(gained, -4)
    expect(unchanged).toBe(gained)
  })

  it('unlocks a blueprint by spending Francs, Research XP, and materials once', () => {
    const state = makeState({
      player: {
        francs: 500,
        researchXP: 50,
        stash: { copper: 4, iron: 2 },
      },
    })
    const unlocked = applyUnlockBlueprint(state, 'garage', 125, 20, { copper: 3 })

    expect(unlocked.player.unlockedBlueprints).toEqual(['garage'])
    expect(unlocked.player.francs).toBe(375)
    expect(unlocked.player.researchXP).toBe(30)
    expect(unlocked.player.stash?.copper).toBe(1)

    const duplicate = applyUnlockBlueprint(unlocked, 'garage', 125, 20, { copper: 1 })
    expect(duplicate).toBe(unlocked)
  })

  it('does not unlock a blueprint when any cost is unaffordable', () => {
    const state = makeState({ player: { francs: 10, researchXP: 10, stash: { copper: 1 } } })

    expect(applyUnlockBlueprint(state, 'garage', 11)).toBe(state)
    expect(applyUnlockBlueprint(state, 'garage', 0, 11)).toBe(state)
    expect(applyUnlockBlueprint(state, 'garage', 0, 0, { copper: 2 })).toBe(state)
  })

  it('clears paused mining, rover, and delivery state when abandoning an active mission', () => {
    const state = makeState({
      screen: 'mining',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Eros' },
        miningCargoInProgress: { iron: 2 },
        deliveryUnloadStartedAt: 234567,
        arrivalAt: Date.now() + 60_000,
        headingToDelivery: true,
        debriefPending: true,
        returningToEarth: true,
      },
      deliveredCargo: { iron: 2 },
    })

    const next = applyAbandonMission(state, MISSIONS)

    expect(next.screen).toBe('hub')
    expect(next.player.activeMission).toBeNull()
    expect(next.player.miningCargoInProgress).toBeUndefined()
    expect(next.player.deliveryUnloadStartedAt).toBeUndefined()
    expect(next.player.arrivalAt).toBeNull()
    expect(next.player.headingToDelivery).toBe(false)
    expect(next.player.debriefPending).toBe(false)
    expect(next.player.returningToEarth).toBe(false)
    expect(next.deliveredCargo).toBeNull()
  })
})
