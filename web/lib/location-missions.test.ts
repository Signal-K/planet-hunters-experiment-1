import { describe, expect, it } from 'vitest'
import { agencyStepLocation } from './location-missions'
import type { ProgramStep } from './mission-board-view'
import type { Mission } from './data/types'

const step = (id: string) => ({ id } as ProgramStep)
const mission = (id: string, targetId: string) => ({ id, targetId } as Mission)

describe('agency mission locations', () => {
  it('keeps deployment and servicing flights at their real Earth orbit location', () => {
    expect(agencyStepLocation(step('story-saturn-imager-launch'), [])).toBe('earth')
    expect(agencyStepLocation(step('service-saturn-satellite'), [mission('service-saturn-satellite', 'earth-orbit-saturn-imager')])).toBe('earth')
  })
  it('places probes and other targeted flights on their destination', () => {
    expect(agencyStepLocation(step('probe-launch-mars'), [])).toBe('mars')
    expect(agencyStepLocation(step('flight'), [mission('flight', 'europa')])).toBe('europa')
    expect(agencyStepLocation(step('unknown'), [])).toBeNull()
  })
})
