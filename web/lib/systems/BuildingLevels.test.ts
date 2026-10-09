import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeState } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'
import { BUILDING_LEVEL_EFFECTS, BUILDING_UPGRADE_COSTS, SURFACE_SILO_CAPACITY, buildingLevel, sanitizeBuildingLevels } from '@/lib/data'
import { REFINERY_RECIPES } from '@/lib/data/structures'
import { suggestBuild } from '@/lib/data/parts'
import { applyUpgradeBuilding, applyUpgradeLaunchpad, applyStartRefine, storageCapacity } from './EconomySystem'
import { applyStartCandidateTraining } from './AcademySystem'
import { CREW_TRAINING_DURATION_MS } from '@/lib/data/economy'

function state(player: Partial<GameState['player']> = {}): GameState {
  return { ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, francs: 1_000_000_000, placed: ['launchpad', 'surface-silo', 'refinery', 'astronaut-academy'], ...player } }
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
    expect(s.player.placed).toEqual(['launchpad', 'surface-silo', 'refinery', 'astronaut-academy'])
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

  it('academy level shortens candidate training', () => {
    const now = 1_000
    const s = state({ academyFunded: true, buildingLevels: { 'astronaut-academy': 2 } })
    const started = applyStartCandidateTraining(s, 'mining', now)
    expect(started.player.crewTraining?.[0].completesAt).toBe(now + CREW_TRAINING_DURATION_MS * 0.75)
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
