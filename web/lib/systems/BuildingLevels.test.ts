import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeState } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'
import { PARTS, suggestBuild, validateBuild } from '@/lib/data/parts'
import { PAD_LAUNCHES_BETWEEN_SERVICE, PAD_SERVICE_COST, padLaunchesLeft, padNeedsService } from '@/lib/data/building-levels'
import { rocketPadLevel, ROCKET_IDS } from '@/lib/data/rockets'
import { applyServiceLaunchpad } from './EconomySystem'

function state(player: Partial<GameState['player']> = {}): GameState {
  return { ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, francs: 1_000_000_000, placed: ['launchpad', 'surface-silo', 'refinery',], ...player } }
}

describe('building levels', () => {
  it('launchpad level 3 counts as two flown missions for part unlocks', () => {
    const parts = {
      chassis: [{ id: 'c1', name: 'c1', tier: 1, locked: false, img: '', mass: 1, cargo: 2 }, { id: 'c2', name: 'c2', tier: 2, locked: false, img: '', mass: 1, cargo: 6, missionsRequired: 2 }],
      propulsion: [{ id: 'p1', name: 'p1', tier: 1, locked: false, img: '', power: 1, max_orbit: 1 }],
      drill: [{ id: 'd1', name: 'd1', tier: 1, locked: false, img: '', rate: 1 }],
    }
    const chassisAt = (opts: { launchpadUpgraded?: boolean; launchpadLevel?: number }) =>
      suggestBuild({ mission: null, target: null, missionsDone: 0, parts, ...opts, }).chassis
    // Only c2 carries the default 6 units, and it needs two flown missions.
    expect(chassisAt({})).toBe('c1')
    expect(chassisAt({ launchpadUpgraded: true, launchpadLevel: 2 })).toBe('c1')
    expect(chassisAt({ launchpadUpgraded: true, launchpadLevel: 3 })).toBe('c2')
  })

  it('larger hulls need a bigger launchpad (SSL-693)', () => {
    const mission = { requires: { cargo_min: 6, drill_tier: 1 } } as Parameters<typeof validateBuild>[0]['mission']
    const target = { orbit: 1 } as Parameters<typeof validateBuild>[0]['target']
    const flyWith = (chassis: string, launchpadLevel?: number) =>
      validateBuild({ mission, target, rocket: { chassis, propulsion: 'ion-a1', drill: 'hand-drill' }, launchpadLevel })
    expect(flyWith('hull-mk2', 1).ok).toBe(true)
    const heavy = flyWith('hull-mk3', 1)
    expect(heavy.ok).toBe(false)
    expect(heavy.holds).toEqual([{ kind: 'pad', have: 1, need: 2 }])
    expect(flyWith('hull-mk3', 2).ok).toBe(true)
    expect(flyWith('hull-hauler', 2).ok).toBe(false)
    expect(flyWith('hull-hauler', 3).ok).toBe(true)
    expect(flyWith('hull-hauler').ok).toBe(true)
    expect(rocketPadLevel({ id: ROCKET_IDS.surveyor })).toBe(2)
  })

  it('suggested builds stay on hulls the pad can host', () => {
    const mission = { requires: { cargo_min: 16, drill_tier: 1 } } as Parameters<typeof suggestBuild>[0]['mission']
    const at = (launchpadLevel: number) => suggestBuild({ mission, target: null, missionsDone: 6, launchpadLevel, parts: PARTS }).chassis
    expect(at(1)).toBe('hull-cargo')
    expect(at(2)).toBe('hull-mk3')
  })

  it('a bigger launchpad wears less and needs service less often (SSL-693)', () => {
    expect([...PAD_LAUNCHES_BETWEEN_SERVICE]).toEqual([10, 14, 20])
    expect(padLaunchesLeft({ padLaunches: 4 })).toBe(6)
    expect(padLaunchesLeft({ padLaunches: 4, agencyLevels: { launch: 3 } })).toBe(16)
    expect(padNeedsService({ padLaunches: 10 })).toBe(true)
    expect(padNeedsService({ padLaunches: 10, agencyLevels: { launch: 2 } })).toBe(false)
    expect(padNeedsService({ padLaunches: 14, agencyLevels: { launch: 2 } })).toBe(true)
    expect(padNeedsService({})).toBe(false)
  })

  it('servicing costs francs, resets the count and does nothing when unworn or unaffordable', () => {
    const worn = state({ padLaunches: 10, francs: PAD_SERVICE_COST * 3 })
    const done = applyServiceLaunchpad(worn)
    expect(done.player.padLaunches).toBe(0)
    expect(done.player.francs).toBe(PAD_SERVICE_COST * 2)
    expect(applyServiceLaunchpad(done)).toBe(done)
    const broke = state({ padLaunches: 10, francs: PAD_SERVICE_COST - 1 })
    expect(applyServiceLaunchpad(broke)).toBe(broke)
    expect(applyServiceLaunchpad(state({ padLaunches: 10, placed: [] }))).toEqual(expect.objectContaining({ player: expect.objectContaining({ padLaunches: 10 }) }))
  })

  it('keeps the local wear count on merge and cleans a bad saved value', () => {
    const local = state({ padLaunches: 0 })
    const merged = mergeRemoteState(local, { player: { ...state().player, padLaunches: 9, missionsDone: local.player.missionsDone + 1 } })
    expect(merged.player.padLaunches).toBe(0)
    expect(normalizeState({ player: { padLaunches: -3 } as unknown as GameState['player'] }).player.padLaunches).toBe(0)
    expect(normalizeState({ player: { padLaunches: 7.9 } as unknown as GameState['player'] }).player.padLaunches).toBe(7)
  })
})
