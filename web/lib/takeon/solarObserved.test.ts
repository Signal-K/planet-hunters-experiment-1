import { describe, expect, it } from 'vitest'
import { observedCoverage, observedHex } from './solarObserved'

describe('observed terrain coverage', () => {
  it('distinguishes imagery, elevation, and unsupported bodies', () => {
    expect(observedCoverage('mars')).toBe('imagery-and-elevation')
    expect(observedCoverage('moon')).toBe('imagery-and-elevation')
    expect(observedCoverage('earth')).toBe('imagery')
    expect(observedCoverage('europa')).toBe('none')
  })
  it('converts observed colours to the shared surface and orbit palette', () => {
    expect(observedHex({ red: 1, green: 0.5, blue: 0 })).toBe('#ff8000')
  })
})
