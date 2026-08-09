import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { Mission } from '@/lib/data'
import { applyConstructionCompletion, resolveConstructionState } from './ConstructionSystem'

const mission: Mission = {
  id: 'construct-fuel-depot', title: 'Fuel depot', brief: '', client: 'helios', tag: 'CONSTRUCT', difficulty: 'L2', locked: false, sequence: 4,
  construction: { structureKind: 'fuel-depot', requiredMaterials: { hydrogen: 8 }, placementMode: 'confirm', buildTimeMs: 1000 },
  requires: { minerals: { hydrogen: 8 }, cargo_min: 8, drill_tier: 1, max_orbit: 5 }, payout: { francs: 100, affinity: 2 },
}

describe('ConstructionSystem', () => {
  it('records a build on an exoplanet without special-casing target type', () => {
    const player = applyConstructionCompletion(DEFAULT_STATE.player, mission, 'discovered-exoplanet-1', 10_000)
    expect(player.clientStructures).toEqual([{
      targetId: 'discovered-exoplanet-1', structureKind: 'fuel-depot', clientId: 'helios', state: 'under-construction', startedAt: 10_000,
    }])
  })

  it('does not duplicate a repeated completion callback', () => {
    const once = applyConstructionCompletion(DEFAULT_STATE.player, mission, 'bennu', 10_000)
    const twice = applyConstructionCompletion(once, mission, 'bennu', 20_000)
    expect(twice.clientStructures).toHaveLength(1)
    expect(twice.clientStructures?.[0]?.startedAt).toBe(10_000)
  })

  it('resolves an elapsed build to operational', () => {
    const record = { targetId: 'bennu', structureKind: 'fuel-depot', clientId: 'helios', state: 'under-construction' as const, startedAt: 10_000 }
    expect(resolveConstructionState(record, 1000, 11_000).state).toBe('operational')
    expect(resolveConstructionState(record, 1000, 10_999).state).toBe('under-construction')
  })
})
