import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { MINERAL_META, customizerPartById } from '@/lib/data'
import { applySellMinerals, applyConfirmShipCustomizerBuild, decayedUnitsSold, openMarketSellPrice, supplyDipMultiplier } from './EconomySystem'

function makeState(overrides: Partial<GameState['player']> = {}): GameState {
  return {
    screen: 'market',
    player: {
      francs: 0,
      activeMission: null,
      missionCount: 0,
      pendingLaunch: false,
      placed: [],
      placementPlots: {},
      controlBuilt: false,
      missionsDone: 3,
      freeOperations: true,
      clientMissions: {},
      clientCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
      roverDeployments: [],
      clientTerritories: {},
      stash: {},
      ...overrides,
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
}

describe('openMarketSellPrice', () => {
  it('sells raw minerals at ~80% of market price with no supply history', () => {
    expect(openMarketSellPrice(100, 0)).toBe(80)
  })

  it('dips price as more units are sold, capped at a 60% max dip', () => {
    expect(supplyDipMultiplier(0)).toBe(1)
    expect(supplyDipMultiplier(10)).toBeCloseTo(0.9)
    expect(supplyDipMultiplier(1000)).toBe(0.4)
    expect(openMarketSellPrice(100, 1000)).toBe(Math.round(100 * 0.8 * 0.4))
  })
})

describe('applySellMinerals', () => {
  it('pays the discounted open-market rate and tracks cumulative supply sold', () => {
    const s = makeState({ stash: { iron: 10 } })
    const next = applySellMinerals(s, 'iron', 4)
    const meta = MINERAL_META.iron
    expect(next.player.francs).toBe(openMarketSellPrice(meta.price, 0) * 4)
    expect(next.player.stash?.iron).toBe(6)
    expect(next.player.marketSupply?.iron).toBe(4)
  })

  it('applies a lower price on a subsequent sale of the same mineral', () => {
    const s = makeState({ stash: { iron: 200 }, marketSupply: { iron: 50 } })
    const next = applySellMinerals(s, 'iron', 10)
    const meta = MINERAL_META.iron
    expect(next.player.francs).toBe(openMarketSellPrice(meta.price, 50) * 10)
    expect(next.player.francs).toBeLessThan(openMarketSellPrice(meta.price, 0) * 10)
    expect(next.player.marketSupply?.iron).toBe(60)
  })

  it('is a no-op when nothing is held', () => {
    const s = makeState({ stash: {} })
    expect(applySellMinerals(s, 'iron', 5)).toBe(s)
  })

  it('recovers supply over real elapsed time instead of capping out permanently', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    const s = makeState({
      stash: { iron: 10 },
      marketSupply: { iron: 60 }, // at the max dip
      marketSupplyUpdatedAt: { iron: twoHoursAgo },
    })
    const next = applySellMinerals(s, 'iron', 1)
    const meta = MINERAL_META.iron
    // Full recovery window elapsed, so this sale should price as if no
    // supply pressure existed at all (unitsSold effectively back to 0).
    expect(next.player.francs).toBe(openMarketSellPrice(meta.price, 0) * 1)
  })

  it('treats missing marketSupplyUpdatedAt as no decay (legacy save data)', () => {
    expect(decayedUnitsSold(50, undefined)).toBe(50)
  })
})

describe('applyConfirmShipCustomizerBuild', () => {
  const engineT1 = customizerPartById('ion-thruster-t1')!
  const engineT2 = customizerPartById('pulse-thruster-t1')!
  const boosterT1 = customizerPartById('strap-booster-t1')!

  it('charges full price for a newly installed slot and persists the loadout', () => {
    const s = makeState({ francs: engineT1.price + 1_000 })
    const { state, ok } = applyConfirmShipCustomizerBuild(s, { engine: engineT1.id }, {})
    expect(ok).toBe(true)
    expect(state.player.francs).toBe(1_000)
    expect(state.player.shipCustomizerParts).toEqual({ engine: engineT1.id })
  })

  it('only charges the price delta for a slot that was already owned', () => {
    const delta = engineT2.price - engineT1.price
    const s = makeState({ francs: delta + 1_000, shipCustomizerParts: { engine: engineT1.id } })
    const { state, ok } = applyConfirmShipCustomizerBuild(s, { engine: engineT2.id }, { engine: engineT1.id })
    expect(ok).toBe(true)
    expect(state.player.francs).toBe(1_000)
  })

  it('does not charge for slots that are unchanged from the prior confirm', () => {
    const s = makeState({ francs: 1_000, shipCustomizerParts: { engine: engineT1.id } })
    const { state, ok } = applyConfirmShipCustomizerBuild(s, { engine: engineT1.id }, { engine: engineT1.id })
    expect(ok).toBe(true)
    expect(state.player.francs).toBe(1_000)
  })

  it('rejects the build and leaves state untouched when the player cannot afford it', () => {
    const s = makeState({ francs: 100, shipCustomizerParts: {} })
    const { state, ok } = applyConfirmShipCustomizerBuild(s, { booster: boosterT1.id }, {})
    expect(ok).toBe(false)
    expect(state).toBe(s)
    expect(state.player.francs).toBe(100)
  })
})
