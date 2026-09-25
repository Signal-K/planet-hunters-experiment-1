import { describe, expect, it } from 'vitest'
import type { GameState, Player } from '@/lib/game-types'
import { craftingRecipeForTakeonType, SKILL_NODES } from '@/lib/data'
import {
  applyFieldBuild,
  applyFieldDemolish,
  applyFieldFabricate,
  applyFieldRefining,
  applySeedBiosphere,
  FIELD_REFINE_INTERVAL_MS,
  fieldMineralPool,
} from './SandboxSystem'

const NOW = 10_000_000
const ME = { id: 'p1', name: 'Liam' }

function stateWith(player: Partial<Player>): GameState {
  return {
    player: {
      francs: 5_000_000,
      stash: { iron: 10, aluminium: 20, copper: 10, silicon: 10, carbon: 5 },
      refinedGoods: {},
      surfaceOps: { sites: { 'mars-arcadia': { storage: { copper: 8, gold: 3 }, siteAccessPurchasedAt: 1 } } },
      ...player,
    } as Player,
  } as GameState
}

describe('field builds', () => {
  it('charges francs and minerals, storage first, and records the structure', () => {
    const before = stateWith({})
    const road = craftingRecipeForTakeonType('road')!
    const result = applyFieldBuild(before, { targetId: 'mars', siteId: 'mars-arcadia' }, { id: 's1', type: 'road', x: 3, y: 4, facing: 0 }, ME, NOW)
    expect(result.ok).toBe(true)
    expect(result.state.player.francs).toBe(5_000_000 - road.costFrancs)
    expect(result.state.player.stash?.iron).toBe(9)
    expect(result.state.player.fieldStructures?.mars).toEqual([
      { id: 's1', type: 'road', recipeId: road.id, x: 3, y: 4, facing: 0, builtAt: NOW, siteId: 'mars-arcadia' },
    ])
  })

  it('draws from site storage before the stash', () => {
    const before = stateWith({})
    const result = applyFieldBuild(before, { targetId: 'mars', siteId: 'mars-arcadia' }, { id: 'b1', type: 'beacon', x: 0, y: 0, facing: 1 }, ME, NOW)
    expect(result.ok).toBe(true)
    const site = result.state.player.surfaceOps!.sites['mars-arcadia']
    expect(site.storage.copper).toBe(6)
    expect(result.state.player.stash?.copper).toBe(10)
    expect(result.state.player.stash?.aluminium).toBe(16)
  })

  it('refuses when the player cannot pay and leaves state untouched', () => {
    const before = stateWith({ francs: 0, stash: {} })
    const result = applyFieldBuild(before, { targetId: 'mars' }, { id: 's1', type: 'solar-array', x: 0, y: 0, facing: 0 }, ME, NOW)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/Short/)
    expect(result.state).toBe(before)
  })

  it('a beacon stakes the division it stands in and demolition releases it', () => {
    const built = applyFieldBuild(stateWith({}), { targetId: 'mars' }, { id: 'beacon-1', type: 'beacon', x: 5, y: 5, facing: 0 }, ME, NOW)
    expect(built.claim?.targetId).toBe('mars')
    expect(built.claim?.beaconStructureId).toBe('beacon-1')
    expect(built.state.player.territoryClaims).toHaveLength(1)
    const demolished = applyFieldDemolish(built.state, 'mars', 'beacon-1')
    expect(demolished.player.territoryClaims).toEqual([])
    expect(demolished.player.fieldStructures?.mars).toEqual([])
  })

  it('a beacon on a client-held division is placed but not claimed', () => {
    // mars:1-2 is Ferrum's; tiles with y >= 0 land in band 1, sector = floor(x/64) % 4.
    const built = applyFieldBuild(stateWith({}), { targetId: 'mars' }, { id: 'b2', type: 'beacon', x: 128, y: 2, facing: 0 }, ME, NOW)
    expect(built.ok).toBe(true)
    expect(built.claim).toBeUndefined()
    expect(built.state.player.territoryClaims ?? []).toEqual([])
  })

  it('is idempotent for a structure id already recorded', () => {
    const once = applyFieldBuild(stateWith({}), { targetId: 'mars' }, { id: 's1', type: 'road', x: 0, y: 0, facing: 0 }, ME, NOW)
    const twice = applyFieldBuild(once.state, { targetId: 'mars' }, { id: 's1', type: 'road', x: 0, y: 0, facing: 0 }, ME, NOW)
    expect(twice.state).toBe(once.state)
  })

  it('pool merges storage and stash', () => {
    expect(fieldMineralPool(stateWith({}).player, 'mars-arcadia').copper).toBe(18)
    expect(fieldMineralPool(stateWith({}).player).copper).toBe(10)
  })
})

describe('field processing', () => {
  it('a site refinery converts buffered ore into refined goods once per interval', () => {
    const withRefinery = stateWith({
      fieldStructures: { mars: [{ id: 'r1', type: 'refinery', recipeId: 'field-refinery', x: 0, y: 0, facing: 0, builtAt: 0, siteId: 'mars-arcadia' }] },
    })
    const first = applyFieldRefining(withRefinery, { targetId: 'mars', siteId: 'mars-arcadia' }, NOW)
    expect(first.player.refinedGoods['refined-gold']).toBe(1)
    expect(first.player.refinedGoods['refined-copper']).toBe(1)
    expect(first.player.surfaceOps!.sites['mars-arcadia'].storage).toEqual({ copper: 4 })
    const tooSoon = applyFieldRefining(first, { targetId: 'mars', siteId: 'mars-arcadia' }, NOW + 1000)
    expect(tooSoon).toBe(first)
    const later = applyFieldRefining(first, { targetId: 'mars', siteId: 'mars-arcadia' }, NOW + FIELD_REFINE_INTERVAL_MS)
    expect(later.player.refinedGoods['refined-copper']).toBe(2)
  })

  it('does nothing without a refinery', () => {
    const s = stateWith({})
    expect(applyFieldRefining(s, { targetId: 'mars', siteId: 'mars-arcadia' }, NOW)).toBe(s)
  })

  it('a factory fabricates rocket parts from refined goods', () => {
    const s = stateWith({
      refinedGoods: { 'refined-aluminium': 2, 'refined-cobalt': 1 },
      fieldStructures: { mars: [{ id: 'f1', type: 'factory', recipeId: 'field-factory', x: 0, y: 0, facing: 0, builtAt: 0 }] },
    })
    const noFactory = applyFieldFabricate(stateWith({ refinedGoods: { 'refined-aluminium': 2, 'refined-cobalt': 1 } }), 'mars', 'fab-hull-alloy-ii')
    expect(noFactory.ok).toBe(false)
    const result = applyFieldFabricate(s, 'mars', 'fab-hull-alloy-ii')
    expect(result.ok).toBe(true)
    expect(result.state.player.fabricatedRocketParts?.['hull-alloy-ii']).toBe(1)
    expect(result.state.player.refinedGoods).toEqual({})
    expect(result.state.player.francs).toBe(5_000_000 - 250_000)
  })
})

describe('biosphere seeding', () => {
  const EXO = { id: 'exo-1', type: 'exoplanet' as const, archetype: 'S' as const, planetRadiusEarth: 1.1, periodDays: 37, starTeffK: 3480 }
  it('requires the full tech tree and the SETI programme', () => {
    const locked = applySeedBiosphere(stateWith({}), EXO, NOW)
    expect(locked.ok).toBe(false)
    expect(locked.reason).toMatch(/skill tree/)
    const noSeti = applySeedBiosphere(stateWith({ unlockedSkillNodes: SKILL_NODES.map(n => n.id) }), EXO, NOW)
    expect(noSeti.reason).toMatch(/SETI/)
    const ready = applySeedBiosphere(stateWith({ unlockedSkillNodes: SKILL_NODES.map(n => n.id), setiProgrammeCompletedAt: 1 }), EXO, NOW)
    expect(ready.ok).toBe(true)
    expect(ready.state.player.biosphereSeeds?.['exo-1']).toEqual({ targetId: 'exo-1', seededAt: NOW })
  })

  it('refuses sterile worlds even when unlocked', () => {
    const s = stateWith({ unlockedSkillNodes: SKILL_NODES.map(n => n.id), setiProgrammeCompletedAt: 1 })
    expect(applySeedBiosphere(s, { id: 'bennu', type: 'asteroid', archetype: 'C' }, NOW).ok).toBe(false)
  })
})
