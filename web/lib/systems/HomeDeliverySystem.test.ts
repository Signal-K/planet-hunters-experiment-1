import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '@/lib/game-state'
import { applyReturnArrived } from './MiningSystem'
import { applyHomeSplit, contractFulfilled, defaultHomeSplit, leftBehind, releaseUnit, shiftUnit, splitTotals } from './HomeDeliverySystem'

describe('HomeDeliverySystem (SSL-553)', () => {
  const cargo = { iron: 6, nickel: 2 }
  const demand = { iron: 4 }

  it('fills the contract first, then the silo, and leaves the rest behind', () => {
    const split = defaultHomeSplit(cargo, demand, 3)
    expect(split.iron).toEqual({ client: 4, silo: 2 })
    expect(split.nickel).toEqual({ client: 0, silo: 1 })
    expect(leftBehind(split, cargo, 'nickel')).toBe(1)
    expect(contractFulfilled(split, demand)).toBe(true)
  })

  it('moves units between the client and the silo, and respects demand and silo room', () => {
    let split = defaultHomeSplit(cargo, demand, 1)
    split = releaseUnit(split, 'iron', 'client')
    expect(split.iron.client).toBe(3)
    expect(contractFulfilled(split, demand)).toBe(false)
    expect(shiftUnit(split, cargo, 'iron', 'silo', demand, 1)).toBe(split) // silo full
    split = shiftUnit(split, cargo, 'iron', 'client', demand, 1)
    expect(split.iron.client).toBe(4)
    expect(shiftUnit(split, cargo, 'iron', 'client', demand, 1)).toBe(split) // client capped at demand
    const t = splitTotals(split)
    expect(t.client + t.silo + leftBehind(split, cargo, 'iron') + leftBehind(split, cargo, 'nickel')).toBe(8)
  })

  it('return arrival opens the delivery sheet; settling drops what was left behind and marks the haul settled', () => {
    const base = { ...DEFAULT_STATE, screen: 'flight' as const, missionId: 'm', targetId: 't', lastCargo: cargo,
      player: { ...DEFAULT_STATE.player, debriefPending: true, returningToEarth: true, stash: {} } }
    const home = applyReturnArrived(base)
    expect(home.screen).toBe('debrief')
    expect(home.player.homeDeliveryPending).toBe(true)
    expect(home.player.stash).toEqual(cargo)
    const { state, consumed } = applyHomeSplit(home, { iron: { client: 4, silo: 1 }, nickel: { client: 0, silo: 0 } }, cargo, { payout: 900, affinity: 2 })
    expect(consumed).toEqual({ iron: 4 })
    // SSL-751: the run stays open for the debrief, which reads what the sheet settled.
    expect(state.player.homeSettlement).toEqual({
      payout: 900, affinity: 2, consumed: { iron: 4 }, siloed: { iron: 1 }, left: { iron: 1, nickel: 2 },
    })
    expect(state.player.stash).toEqual({ iron: 5 })
    expect(state.player.francs).toBe(home.player.francs)
    expect(state.player.homeDeliveryPending).toBe(false)
    expect(state.player.cargoSettledOffworld).toBe(true)
  })
})
