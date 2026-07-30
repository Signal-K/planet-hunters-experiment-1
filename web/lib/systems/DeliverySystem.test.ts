import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import {
  applyDeliveryArrived,
  applyDeliveryUnloadComplete,
  DELIVERY_UNLOAD_DURATION_MS,
  deliveryUnloadProgress,
} from './DeliverySystem'

function state(overrides: Partial<GameState> = {}): GameState {
  const base = {
    screen: 'transit',
    missionId: 'lnm_m3_relay_bennu_vesta',
    targetId: 'bennu',
    deliveryTargetId: 'vesta',
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: { iron: 3, carbon: 2 },
    deliveredCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: {
      francs: 0,
      activeMission: { id: 'lnm_m3_relay_bennu_vesta', label: 'Relay' },
      missionPhase: 'transit',
      missionCount: 1,
      pendingLaunch: false,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      controlBuilt: false,
      missionsDone: 2,
      freeOperations: false,
      clientMissions: {},
      clientCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
      headingToDelivery: true,
      returningToEarth: false,
      debriefPending: false,
      arrivalAt: 1_000,
      transitStartedAt: 500,
    },
  } as GameState
  return { ...base, ...overrides, player: { ...base.player, ...(overrides.player ?? {}) } }
}

describe('DeliverySystem', () => {
  it('derives unload progress from a persisted wall-clock epoch', () => {
    const startedAt = 1_000
    expect(deliveryUnloadProgress(startedAt, 1_000)).toBe(0)
    expect(deliveryUnloadProgress(startedAt, 1_000 + DELIVERY_UNLOAD_DURATION_MS / 2)).toBe(0.5)
    expect(deliveryUnloadProgress(startedAt, 1_000 + DELIVERY_UNLOAD_DURATION_MS * 2)).toBe(1)
  })

  it('enters a persisted delivery scene instead of starting the return leg', () => {
    const next = applyDeliveryArrived(state(), 2_000)

    expect(next.screen).toBe('delivery')
    expect(next.player.missionPhase).toBe('delivery')
    expect(next.player.deliveryUnloadStartedAt).toBe(2_000)
    expect(next.player.headingToDelivery).toBe(true)
    expect(next.player.returningToEarth).toBe(false)
    expect(next.lastCargo).toEqual({ iron: 3, carbon: 2 })
  })

  it('empties the hold, retains the delivery receipt, and starts Earth return', () => {
    const unloading = applyDeliveryArrived(state(), 2_000)
    const next = applyDeliveryUnloadComplete(unloading, 9_000, 3_000)

    expect(next.screen).toBe('transit')
    expect(next.lastCargo).toEqual({})
    expect(next.deliveredCargo).toEqual({ iron: 3, carbon: 2 })
    expect(next.player.deliveryUnloadStartedAt).toBeUndefined()
    expect(next.player.headingToDelivery).toBe(false)
    expect(next.player.returningToEarth).toBe(true)
    expect(next.player.debriefPending).toBe(true)
    expect(next.player.arrivalAt).toBe(9_000)
    expect(next.player.transitStartedAt).toBe(3_000)
  })

  it('does not start or complete outside the valid delivery phases', () => {
    const hub = state({ screen: 'hub' })
    const transit = state()
    expect(applyDeliveryArrived(hub, 2_000)).toBe(hub)
    expect(applyDeliveryUnloadComplete(transit, 9_000, 3_000)).toBe(transit)
  })
})
