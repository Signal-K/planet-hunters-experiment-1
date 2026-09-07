import { describe, expect, it } from 'vitest'
import { MINERAL_META } from '@/lib/data/minerals'
import { LANDNAM_TO_TAKEON_MINERAL } from './minerals'

describe('LANDNAM_TO_TAKEON_MINERAL', () => {
  it('maps every Landnam mineral to a Takeon resource', () => {
    // KES-231: a missing entry here silently drops that mineral when
    // seeding a Takeon scene's cargo. If it's the only mineral in the
    // player's hold (e.g. a nickel-only delivery leg), the rover's seeded
    // cargo ends up completely empty and DUMP CARGO can never bank
    // anything — the mission soft-locks with no error or feedback.
    const unmapped = Object.keys(MINERAL_META).filter(id => !LANDNAM_TO_TAKEON_MINERAL[id])
    expect(unmapped).toEqual([])
  })
})
