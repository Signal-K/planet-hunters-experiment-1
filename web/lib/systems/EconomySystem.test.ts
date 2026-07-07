import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { MINERAL_META } from '@/lib/data'
import { applySellMinerals, openMarketSellPrice, supplyDipMultiplier } from './EconomySystem'

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
      contractorMissions: {},
      contractorCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
      roverDeployments: [],
      contractorTerritories: {},
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
})
