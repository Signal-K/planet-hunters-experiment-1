import { describe, expect, it } from 'vitest'
import { compatibleTargetsFor, TARGETS } from './targets'
import type { Mission } from './types'

const mission: Mission = {
  id: 'test', title: 'Test', brief: '', tag: 'FREE OPS', difficulty: 'L1', locked: false, sequence: 4,
  requires: { minerals: {}, cargo_min: 1, drill_tier: 1, max_orbit: 6 }, payout: { francs: 0, affinity: 0 },
}
const jupiter = TARGETS.find(target => target.id === 'jupiter')!

describe('mission destination capabilities', () => {
  it('excludes gas giants from surface contracts, including fixed destinations and rover work', () => {
    expect(compatibleTargetsFor(mission)).not.toContain(jupiter)
    expect(compatibleTargetsFor({ ...mission, targetId: jupiter.id })).toEqual([])
    expect(compatibleTargetsFor({ ...mission, targetId: jupiter.id, payload: { type: 'rover', name: 'Rover', cargoCost: 0 } })).toEqual([])
  })
  it('allows orbital payloads at fixed and selectable gas giants', () => {
    const orbital: Mission = { ...mission, payload: { type: 'satellite', name: 'Probe', cargoCost: 0 } }
    expect(compatibleTargetsFor(orbital)).toContain(jupiter)
    expect(compatibleTargetsFor({ ...orbital, targetId: jupiter.id })).toEqual([jupiter])
  })
})
