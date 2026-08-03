import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { MINERAL_META, CLIENT_SLOTS, STRUCTURES, customizerPartById } from '@/lib/data'
import { applySellMinerals, applyConfirmShipCustomizerBuild, applyPlaceStructure, applyStartRefine, decayedUnitsSold, openMarketSellPrice, sellQuote, sellUnitPrice, supplyDipMultiplier } from './EconomySystem'

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

describe('Academy and staffing economy', () => {
  it('charges the Academy build cost and materials only after research', () => {
    const academy = STRUCTURES.find(structure => structure.id === 'astronaut-academy')!
    const stash = { aluminium: 24, silicon: 12, copper: 8 }
    const locked = makeState({ francs: academy.cost, stash, academyResearched: false })
    expect(applyPlaceStructure(locked, academy, academy.kind, 2)).toBe(locked)

    const built = applyPlaceStructure(
      makeState({ francs: academy.cost, stash, academyResearched: true }),
      academy,
      academy.kind,
      2,
    )
    expect(built.player.francs).toBe(0)
    expect(built.player.placed).toContain('astronaut-academy')
    expect(built.player.stash).toMatchObject({ aluminium: 0, silicon: 0, copper: 0 })
    expect(built.player.academyFunded).toBe(true)
    expect(built.player.crewUpkeepSettledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('cuts refinery duration by 25% while the refinery is staffed', () => {
    const recipe = {
      id: 'staff-test',
      name: 'Staff test',
      input: { mineral: 'iron', amount: 1 },
      output: { name: 'Ingot', sym: 'Fe+', color: '#999', price: 1 },
      time: 100,
      cost: 0,
    }
    const unstaffed = applyStartRefine(makeState({ stash: { iron: 1 } }), recipe)
    const staffed = applyStartRefine(makeState({
      stash: { iron: 1 },
      structureCrewAssignments: { refinery: 'crew-1' },
    }), recipe)
    expect(unstaffed.player.refineryQueue[0].durationMs).toBe(100_000)
    expect(staffed.player.refineryQueue[0].durationMs).toBe(75_000)
  })
})

describe('sell quote and sale agree', () => {
  // Regression: the Commodity Exchange quoted the client premium applied to the
  // undiscounted base price while applySellMinerals paid the open-market rate,
  // so a player with an active client was shown a price they never received.
  const premiumClient = CLIENT_SLOTS.find(c => c.payoutPremium > 0 && c.mineralPreferences.length > 0)

  it('credits exactly what the screen quoted, with no client', () => {
    const s = makeState({ stash: { iron: 4 } })
    const quoted = sellQuote({ iron: 4 }, s.player)
    expect(applySellMinerals(s, 'iron', 4).player.francs).toBe(quoted)
  })

  it('credits exactly what the screen quoted, with a preferring client', () => {
    if (!premiumClient) return
    const mineral = premiumClient.mineralPreferences[0]
    const s = makeState({ stash: { [mineral]: 3 }, lastClient: premiumClient.id })
    const quoted = sellQuote({ [mineral]: 3 }, s.player, premiumClient.id)
    expect(applySellMinerals(s, mineral, 3).player.francs).toBe(quoted)
  })

  it('pays the client premium over the open-market rate for preferred minerals', () => {
    if (!premiumClient) return
    const mineral = premiumClient.mineralPreferences[0]
    const s = makeState({ stash: { [mineral]: 1 }, lastClient: premiumClient.id })
    const { price, base, premiumApplied } = sellUnitPrice(mineral, s.player, premiumClient.id)
    expect(premiumApplied).toBe(true)
    expect(price).toBeGreaterThan(base)
    expect(base).toBe(openMarketSellPrice(MINERAL_META[mineral].price, 0))
  })

  it('applies no premium to a mineral the client does not want', () => {
    if (!premiumClient) return
    const unwanted = Object.keys(MINERAL_META).find(id => !premiumClient.mineralPreferences.includes(id))!
    const s = makeState({ stash: { [unwanted]: 1 }, lastClient: premiumClient.id })
    const { price, base, premiumApplied } = sellUnitPrice(unwanted, s.player, premiumClient.id)
    expect(premiumApplied).toBe(false)
    expect(price).toBe(base)
  })
})
