import { describe, expect, it } from 'vitest'
import { MISSIONS, TARGETS } from '@/lib/data'
import { buildHoldLine, validateBuild } from '@/lib/data/parts'

// SSL-750: the launch review names what the flying rocket is short of, in one line.
describe('build holds', () => {
  const target = TARGETS.find(t => t.id === 'bennu')!
  const rocket = { chassis: 'hull-mk1', propulsion: 'fusion-b2', drill: 'laser-t2' }

  it('reports a cargo shortfall as numbers and a short line naming the vehicle', () => {
    const mission = { ...MISSIONS[0], requires: { ...MISSIONS[0].requires, cargo_min: 99, drill_tier: 1 } }
    const check = validateBuild({ mission, target, rocket })
    expect(check.ok).toBe(false)
    const hold = check.holds!.find(h => h.kind === 'cargo')!
    expect(hold.need).toBe(99)
    expect(buildHoldLine(hold, 'Explorer')).toBe(`Explorer holds ${hold.have}U, this job needs 99U`)
  })

  it('has no holds when the rocket fits', () => {
    const mission = { ...MISSIONS[0], requires: { ...MISSIONS[0].requires, cargo_min: 0, drill_tier: 1 } }
    const check = validateBuild({ mission, target, rocket })
    expect(check.ok).toBe(true)
    expect(check.holds).toEqual([])
  })
})
