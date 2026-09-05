import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { applyMiningDone, applyReturnArrived, applyRoverMiningDone } from './MiningSystem'
import { applyDeliveryArrived, applyDeliveryUnloadComplete } from './DeliverySystem'

type GameStateOverrides = Omit<Partial<GameState>, 'player'> & {
  player?: Partial<GameState['player']>
}

function makeState(overrides: GameStateOverrides = {}): GameState {
  const base: GameState = {
    screen: 'mining',
    player: {
      francs: 1_000,
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
      licenseGrade: 'Grade I',
      researchXP: 0,
      unlockedBlueprints: [],
    },
    missionId: 'lnm_relay_psyche_ceres',
    targetId: 'psyche',
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

describe('applyMiningDone', () => {
  it('sends the player straight to the Earth-return leg for single-leg missions', () => {
    const s = makeState({ screen: 'mining' })
    const next = applyMiningDone(s, { nickel: 2 }, 1_000)

    expect(next.screen).toBe('transit')
    expect(next.lastCargo).toEqual({ nickel: 2 })
    expect(next.player.returningToEarth).toBe(true)
    expect(next.player.headingToDelivery).toBe(false)
    expect(next.player.debriefPending).toBe(true)
    expect(next.player.shipDestroyed).toBe(false)
  })

  it('routes to the delivery leg instead of Earth when deliveryTargetId is set', () => {
    const s = makeState({ screen: 'mining', deliveryTargetId: 'ceres' })
    const next = applyMiningDone(s, { nickel: 2, cobalt: 2 }, 1_000)

    expect(next.screen).toBe('transit')
    expect(next.player.headingToDelivery).toBe(true)
    expect(next.player.returningToEarth).toBe(false)
    expect(next.player.debriefPending).toBe(false)
  })

  it('is a no-op outside the mining screen or without an active mission/target', () => {
    const s = makeState({ screen: 'hub' })
    expect(applyMiningDone(s, { nickel: 2 }, null)).toBe(s)
  })

  it('clears miningCargoInProgress once the run completes, since it is only needed to survive a Back-to-hub pause', () => {
    const s = makeState({ screen: 'mining', player: { miningCargoInProgress: { nickel: 1 } } })
    const next = applyMiningDone(s, { nickel: 2 }, 1_000)
    expect(next.player.miningCargoInProgress).toBeUndefined()
  })
})

describe('applyRoverMiningDone', () => {
  it('clears roverMiningStartedAt once the run completes', () => {
    const s = makeState({ screen: 'rover-mining', player: { roverMiningStartedAt: Date.now() } })
    const next = applyRoverMiningDone(s, { ice: 3 }, 500)
    expect(next.player.roverMiningStartedAt).toBeUndefined()
  })

  it('mirrors applyMiningDone for the delivery/return branching', () => {
    const s = makeState({ screen: 'rover-mining', deliveryTargetId: 'ceres' })
    const next = applyRoverMiningDone(s, { ice: 3 }, 500)
    expect(next.screen).toBe('transit')
    expect(next.player.headingToDelivery).toBe(true)
  })
})

describe('applyReturnArrived', () => {
  it('keeps delivered cargo out of the Earth stash and retains its receipt for debrief', () => {
    const afterMining = applyMiningDone(makeState({ screen: 'mining', deliveryTargetId: 'ceres' }), { nickel: 2 }, 1_000)
    const unloading = applyDeliveryArrived(afterMining, 2_000)
    const afterDelivery = applyDeliveryUnloadComplete(unloading, 3_000, 2_500)
    const next = applyReturnArrived(afterDelivery)

    expect(next.screen).toBe('debrief')
    expect(next.deliveryTargetId).toBeNull()
    expect(next.player.stash).toEqual({})
    expect(next.lastCargo).toEqual({})
    expect(next.deliveredCargo).toEqual({ nickel: 2 })
    expect(next.player.shipDestroyed).toBe(false)
    expect(next.player.debriefPending).toBe(false)
    expect(next.player.returningToEarth).toBe(false)
  })

  it('merges cargo into stash for a single-leg Earth return', () => {
    const afterMining = applyMiningDone(makeState({ screen: 'mining' }), { nickel: 2 }, 1_000)
    const next = applyReturnArrived(afterMining)

    expect(next.player.stash).toEqual({ nickel: 2 })
    expect(next.deliveredCargo).toBeNull()
  })

  it('is a no-op without pending debrief cargo', () => {
    const s = makeState({ player: { debriefPending: false }, lastCargo: null })
    expect(applyReturnArrived(s)).toBe(s)
  })
})
