import { describe, expect, it } from 'vitest'
import { formatCountdown, formatCountdownUnit, formatFrancs } from './format'

describe('formatFrancs', () => {
  it.each([
    [0, '0'],
    [12_345, '12,345'],
    [1_000_000, '1,000,000'],
  ])('formats %i as %s', (value, expected) => {
    expect(formatFrancs(value)).toBe(expected)
  })

  it.each([
    [1_000_000, '1M'],
    [12_600_000, '13M'],
    [1_250_000_000, '1.3B'],
  ])('formats %i compactly as %s', (value, expected) => {
    expect(formatFrancs(value, { compact: true })).toBe(expected)
  })
})

describe('formatCountdown', () => {
  it.each([
    [-1, '00:00'],
    [0, '00:00'],
    [1, '00:01'],
    [60_001, '01:01'],
    [3_600_000, '60:00'],
  ])('formats %i milliseconds as %s', (value, expected) => {
    expect(formatCountdown(value)).toBe(expected)
  })

  it('pads calendar countdown units without changing their values', () => {
    expect(formatCountdownUnit(4)).toBe('04')
    expect(formatCountdownUnit(12)).toBe('12')
  })
})
