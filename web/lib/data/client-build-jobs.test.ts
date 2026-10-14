import { describe, expect, it } from 'vitest'
import { CLIENT_BUILD_CARGO_CAP, clientBuildMaterials, generateDailyClientPool } from './daily-client-missions'
import { CLIENT_SLOTS } from './clients'
import { MINERAL_META } from './minerals'
import { TARGETS, compatibleTargetsFor } from './targets'
import { DEFAULT_STATE } from '@/lib/game-state'
import { applyConstructionCompletion, resolveConstructionState } from '@/lib/systems/ConstructionSystem'

const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10))

describe('client build jobs (SSL-571)', () => {
  it('only ask for materials one reachable target holds', () => {
    // Fuel depot lists hydrogen + aluminium, which no body within orbit 5 holds together.
    const m = clientBuildMaterials({ hydrogen: 8, aluminium: 6 }, 5)
    expect(m).not.toBeNull()
    expect(TARGETS.some(t => t.orbit <= 5 && Object.keys(m!).every(k => t.minerals.includes(k)))).toBe(true)
  })

  it('every build job on every day can be flown in one run', () => {
    const builds = days.flatMap(d => generateDailyClientPool(d, 30, CLIENT_SLOTS, MINERAL_META, {}))
      .filter(m => m.construction)
    expect(new Set(builds.map(m => m.construction!.structureKind)).size).toBe(3)
    for (const m of builds) {
      expect(m.requires.cargo_min).toBeLessThanOrEqual(CLIENT_BUILD_CARGO_CAP)
      expect(compatibleTargetsFor(m, TARGETS).length).toBeGreaterThan(0)
      expect(m.construction!.requiredMaterials).toEqual(m.requires.minerals)
    }
  })

  it('a completed build job leaves the structure at the flown target, operational after its build time', () => {
    const depot = generateDailyClientPool('2026-10-15', 2, CLIENT_SLOTS, MINERAL_META, {}).find(m => m.title === 'Build Fuel Depot')!
    expect(depot.client).toBe('arcturus-battery-systems')
    const target = compatibleTargetsFor(depot, TARGETS)[0]
    const built = applyConstructionCompletion(DEFAULT_STATE.player, depot, target.id, 1_000)
    const record = built.clientStructures!.find(r => r.structureKind === depot.construction!.structureKind)!
    expect(record).toMatchObject({ targetId: target.id, clientId: 'arcturus-battery-systems', state: 'under-construction' })
    const later = resolveConstructionState(record, depot.construction!.buildTimeMs, 1_000 + depot.construction!.buildTimeMs)
    expect(later.state).toBe('operational')
  })
})
