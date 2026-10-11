import { describe, expect, it } from 'vitest'
import { transitBodyReveal, transitBodyShiftPercent } from './transitFlight'

describe('transit destination drift', () => {
  it('holds the body off the right edge at departure and parks it by approach', () => {
    expect(transitBodyReveal(0)).toBe(0)
    expect(transitBodyShiftPercent(0)).toBe(78)
    expect(transitBodyReveal(20)).toBeCloseTo(0.5)
    expect(transitBodyReveal(40)).toBe(1)
    expect(transitBodyReveal(100)).toBe(1)
    expect(transitBodyShiftPercent(40)).toBe(0)
  })
})
