import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '@/lib/game-state'
import { applyReturnArrived } from './MiningSystem'
import { applyHomeSplit, contractFulfilled, defaultHomeSplit, releaseUnit, shiftUnit, splitTotals } from './HomeDeliverySystem'

describe('HomeDeliverySystem (SSL-553)', () => {
  const cargo = { iron: 6, nickel: 2 }
  const demand = { iron: 4 }

  it('fills the contract first, then the silo, then sells the rest', () => {
    const split = defaultHomeSplit(cargo, demand, 3)
    expect(split.iron).toEqual({ client: 4, silo: 2, sell: 0 })
    expect(split.nickel).toEqual({ client: 0, silo: 1, sell: 1 })
    expect(contractFulfilled(split, demand)).toBe(true)
  })

  it('splits one mineral across all three choices and respects demand and silo room', () => {
    let split = defaultHomeSplit(cargo, demand, 1)
    split = releaseUnit(split, 'iron', 'client', 1)
    expect(split.iron.client).toBe(3)
    expect(contractFulfilled(split, demand)).toBe(false)
    expect(shiftUnit(split, 'iron', 'silo', demand, 1)).toBe(split) // silo full
    split = shiftUnit(split, 'iron', 'client', demand, 1)
    expect(split.iron.client).toBe(4)
    expect(shiftUnit(split, 'iron', 'client', demand, 1)).toBe(split) // client capped at demand
    expect(splitTotals(split).client + splitTotals(split).silo + splitTotals(split).sell).toBe(8)
  })

  it('return arrival opens the delivery sheet; settling sells the market share and marks the haul settled', () => {
    const base = { ...DEFAULT_STATE, screen: 'transit' as const, missionId: 'm', targetId: 't', lastCargo: cargo,
      player: { ...DEFAULT_STATE.player, debriefPending: true, returningToEarth: true, stash: {} } }
    const home = applyReturnArrived(base)
    expect(home.screen).toBe('debrief')
    expect(home.player.homeDeliveryPending).toBe(true)
    expect(home.player.stash).toEqual(cargo)
    const { state, consumed } = applyHomeSplit(home, { iron: { client: 4, silo: 1, sell: 1 }, nickel: { client: 0, silo: 0, sell: 2 } }, 1)
    expect(consumed).toEqual({ iron: 4 })
    expect(state.player.stash).toEqual({ iron: 5 })
    expect(state.player.francs).toBeGreaterThan(home.player.francs)
    expect(state.player.homeDeliveryPending).toBe(false)
    expect(state.player.cargoSettledOffworld).toBe(true)
  })
})
