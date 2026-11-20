import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeState } from './game-state'
import { applyGroundTelescopeUpgrade, groundTelescopeUpgrade, sanitizeGroundTelescopeLevels } from './ground-telescope-upgrades'
import { deepSpaceInstrumentDigest } from './systems/InstrumentFeedSystem'
import type { AsteroidCandidate } from './data'

const id = 'ground-telescope'
const owner = () => ({ ...DEFAULT_STATE.player, placed: [id, 'ground-telescope-2'], stash: { iron: 3, nickel: 4 }, groundTelescopeGrandfathered: false })

describe('ground telescope upgrades', () => {
  it('charges stored iron for each step, independently, even before placement', () => {
    const first = applyGroundTelescopeUpgrade(owner(), id)
    expect(first.stash).toEqual({ iron: 2, nickel: 4 })
    expect(first.francs).toBe(owner().francs)
    const second = applyGroundTelescopeUpgrade(first, id)
    expect(second.stash?.iron).toBe(0)
    expect(second.groundTelescopeLevels).toEqual({ [id]: 3 })
    expect(groundTelescopeUpgrade(second, 'ground-telescope-2').level).toBe(1)
    expect(applyGroundTelescopeUpgrade(second, id)).toBe(second)
    expect(groundTelescopeUpgrade(second, id).reason).toBe('Fully upgraded.')
  })

  it('rejects unknown, unowned and unaffordable scopes without changing the save', () => {
    const p = owner()
    expect(applyGroundTelescopeUpgrade(p, 'launchpad')).toBe(p)
    const poor = { ...p, stash: { iron: 0 } }
    expect(applyGroundTelescopeUpgrade(poor, id)).toBe(poor)
    expect(groundTelescopeUpgrade(poor, id).reason).toContain('Needs 1 more iron')
    const unowned = { ...p, placed: [] }
    expect(applyGroundTelescopeUpgrade(unowned, id)).toBe(unowned)
    expect(groundTelescopeUpgrade(unowned, id).reason).toContain('Build')
  })

  it('keeps levels through reload and stale remote merge, sanitizing malformed fields', () => {
    const saved = normalizeState({ ...DEFAULT_STATE, player: applyGroundTelescopeUpgrade(owner(), id) })
    expect(mergeRemoteState(saved, DEFAULT_STATE).player.groundTelescopeLevels).toEqual({ [id]: 2 })
    expect(sanitizeGroundTelescopeLevels({ [id]: 999, 'ground-telescope-2': '3', forged: 3 })).toEqual({ [id]: 3 })
  })

  it('adds each observing scope’s level to the real daily feed, never an unplaced scope', () => {
    const candidates = Array.from({ length: 12 }, (_, i) => ({ id: `a${i}` }) as AsteroidCandidate)
    const p = { ...owner(), deepSpaceTelescopeBuilt: false, groundTelescopeLevels: { [id]: 3, 'ground-telescope-2': 2 }, placementPlots: { [id]: 10, 'ground-telescope-2': 11 } }
    expect(deepSpaceInstrumentDigest(candidates, p, '2026-11-20')).toHaveLength(5)
    expect(deepSpaceInstrumentDigest(candidates, { ...p, placementPlots: {} }, '2026-11-20')).toHaveLength(0)
    expect(deepSpaceInstrumentDigest(candidates, { ...p, placementPlots: {}, groundTelescopeGrandfathered: true }, '2026-11-20')).toHaveLength(3)
  })
})
