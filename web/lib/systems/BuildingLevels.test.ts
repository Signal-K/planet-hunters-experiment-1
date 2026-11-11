import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeState } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'
import { BUILDING_LEVEL_EFFECTS, BUILDING_UPGRADE_COSTS, SURFACE_SILO_CAPACITY, buildingLevel, sanitizeBuildingLevels } from '@/lib/data'
import { REFINERY_RECIPES } from '@/lib/data/structures'
import { PARTS, suggestBuild, validateBuild } from '@/lib/data/parts'
import { PAD_LAUNCHES_BETWEEN_SERVICE, PAD_SERVICE_COST, padBuildMultiplier, padLaunchesLeft, padNeedsService } from '@/lib/data/building-levels'
import { rocketPadLevel, ROCKET_IDS } from '@/lib/data/rockets'
import { structureBuildMs, isUnderConstruction } from '@/lib/systems/HubConstructionSystem'
import { applyServiceLaunchpad, applyUpgradeBuilding, applyUpgradeLaunchpad, applyStartRefine, storageCapacity } from './EconomySystem'

function state(player: Partial<GameState['player']> = {}): GameState {
  return { ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, francs: 1_000_000_000, placed: ['launchpad', 'surface-silo', 'refinery',], ...player } }
}

describe('building levels', () => {
  it('treats old saves as level 1 and the legacy launchpad flag as level 2', () => {
    const old = normalizeState({ player: { placed: ['launchpad', 'surface-silo'] } as GameState['player'] })
    expect(old.player.buildingLevels).toEqual({})
    expect(buildingLevel(old.player, 'surface-silo')).toBe(1)
    const legacy = normalizeState({ player: { placed: ['launchpad'], launchpadUpgraded: true } as GameState['player'] })
    expect(legacy.player.buildingLevels).toEqual({ launchpad: 2 })
    expect(legacy.player.launchpadUpgraded).toBe(true)
  })

  it('sanitises malformed level data without touching placed buildings', () => {
    expect(sanitizeBuildingLevels({ refinery: 9, 'surface-silo': -2, garage: 3, launchpad: 'x' })).toEqual({ refinery: 3 })
    const s = normalizeState({ player: { placed: ['launchpad', 'refinery'], buildingLevels: 'junk' } as unknown as GameState['player'] })
    expect(s.player.placed).toEqual(['launchpad', 'refinery'])
    expect(s.player.buildingLevels).toEqual({})
  })

  it('upgrades step by step, charges the table price and stops at level 3', () => {
    let s = state()
    const before = s.player.francs
    s = applyUpgradeBuilding(s, 'refinery')
    expect(s.player.buildingLevels?.refinery).toBe(2)
    expect(s.player.francs).toBe(before - BUILDING_UPGRADE_COSTS.refinery[0])
    s = applyUpgradeBuilding(s, 'refinery')
    expect(s.player.buildingLevels?.refinery).toBe(3)
    const maxed = applyUpgradeBuilding(s, 'refinery')
    expect(maxed).toBe(s)
    expect(s.player.placed).toEqual(['launchpad', 'surface-silo', 'refinery'])
  })

  it('refuses unaffordable, unplaced and unknown buildings', () => {
    const poor = state({ francs: 1 })
    expect(applyUpgradeBuilding(poor, 'refinery')).toBe(poor)
    const unplaced = state({ placed: ['launchpad'] })
    expect(applyUpgradeBuilding(unplaced, 'refinery')).toBe(unplaced)
    expect(applyUpgradeBuilding(unplaced, 'garage')).toBe(unplaced)
  })

  it('maps the launchpad upgrade onto level 2 and keeps the legacy flag', () => {
    const s = applyUpgradeLaunchpad(state())
    expect(s.player.buildingLevels?.launchpad).toBe(2)
    expect(s.player.launchpadUpgraded).toBe(true)
    expect(applyUpgradeLaunchpad(s)).toBe(s)
  })

  it('silo capacity scales x2 and x3', () => {
    let s = state({ subsurfaceBuilt: [] })
    expect(storageCapacity(s.player)).toBe(SURFACE_SILO_CAPACITY)
    s = applyUpgradeBuilding(s, 'surface-silo')
    expect(storageCapacity(s.player)).toBe(SURFACE_SILO_CAPACITY * 2)
    s = applyUpgradeBuilding(s, 'surface-silo')
    expect(storageCapacity(s.player)).toBe(SURFACE_SILO_CAPACITY * 3)
  })

  it('refinery level shortens the refining time', () => {
    const recipe = REFINERY_RECIPES[0]
    const stash = { [recipe.input.mineral]: recipe.input.amount }
    const l1 = applyStartRefine(state({ stash, refineryQueue: [], refineryLastStartedAt: undefined }), recipe)
    const l3 = applyStartRefine(state({ stash, refineryQueue: [], refineryLastStartedAt: undefined, buildingLevels: { refinery: 3 } }), recipe)
    expect(l3.player.refineryQueue[0].durationMs).toBe((l1.player.refineryQueue[0].durationMs ?? 0) * 0.5)
  })

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

  it('structures build faster on a bigger launchpad', () => {
    expect([1, 2, 3].map(padBuildMultiplier)).toEqual([1, 0.75, 0.5])
    expect(structureBuildMs('refinery')).toBe(10_000)
    expect(structureBuildMs('refinery', 2)).toBe(7_500)
    expect(structureBuildMs('refinery', 3)).toBe(5_000)
    const started = 1_000_000
    expect(isUnderConstruction(started, 'refinery', started + 6_000, 1)).toBe(true)
    expect(isUnderConstruction(started, 'refinery', started + 6_000, 3)).toBe(false)
  })

  it('a bigger launchpad wears less and needs service less often (SSL-693)', () => {
    expect([...PAD_LAUNCHES_BETWEEN_SERVICE]).toEqual([10, 14, 20])
    expect(padLaunchesLeft({ padLaunches: 4 })).toBe(6)
    expect(padLaunchesLeft({ padLaunches: 4, buildingLevels: { launchpad: 3 } })).toBe(16)
    expect(padNeedsService({ padLaunches: 10 })).toBe(true)
    expect(padNeedsService({ padLaunches: 10, buildingLevels: { launchpad: 2 } })).toBe(false)
    expect(padNeedsService({ padLaunches: 14, buildingLevels: { launchpad: 2 } })).toBe(true)
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

  it('merge never lowers a level from either side', () => {
    const local = state({ buildingLevels: { refinery: 3 } })
    const merged = mergeRemoteState(local, { player: { ...state().player, buildingLevels: { 'surface-silo': 2 }, missionsDone: local.player.missionsDone + 1 } })
    expect(merged.player.buildingLevels).toEqual({ refinery: 3, 'surface-silo': 2 })
    expect(merged.player.placed).toEqual(expect.arrayContaining(['launchpad', 'refinery']))
  })

  it('matches the cross-platform fixture shared with the native tests', () => {
    const fixture = JSON.parse(readFileSync(path.resolve(process.cwd(), '../native/LandnamCore/Tests/LandnamCoreTests/Fixtures/building-levels.json'), 'utf8'))
    expect(JSON.parse(JSON.stringify(BUILDING_UPGRADE_COSTS))).toEqual(fixture.costs)
    expect(JSON.parse(JSON.stringify(BUILDING_LEVEL_EFFECTS))).toEqual(fixture.effects)
    expect(normalizeState({ player: fixture.save }).player.buildingLevels).toEqual(fixture.levelsAfterNormalise)
  })
})
