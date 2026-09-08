import { describe, expect, it } from 'vitest'
import { formatCountdown, formatCountdownUnit, formatCurrency, formatFrancs, FRANC } from './format'

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

  // STS-539 policy boundary: HUD/summary surfaces read compactly, but anywhere
  // the player must verify an exact figure before committing money (Debrief
  // itemization, Market sell confirmation, ActionConfirmBar) stays on the
  // full comma format. Both behaviours come from this one helper.
  it('keeps sub-million amounts exact even when compact is requested', () => {
    expect(formatFrancs(999_999, { compact: true })).toBe('999,999')
    expect(formatFrancs(1_450, { compact: true })).toBe('1,450')
  })

  it('does not compact unless asked, so exact-verification call sites stay exact', () => {
    expect(formatFrancs(11_430_000_000)).toBe('11,430,000,000')
    expect(formatFrancs(11_430_000_000, { compact: true })).toBe('11.4B')
  })
})

describe('formatCurrency', () => {
  it('marks every amount with the franc sign so no call site hardcodes it', () => {
    expect(formatCurrency(1_300_000_000)).toBe(`${FRANC}1,300,000,000`)
    expect(formatCurrency(1_300_000_000, { compact: true })).toBe(`${FRANC}1.3B`)
  })

  it('shows direction with a sign rather than an arrow', () => {
    // ▲/▼ previously meant both "gain/loss" and "francs" depending on the
    // screen, so a cost and a payout could render identically.
    expect(formatCurrency(250_000_000, { compact: true, signed: true })).toBe(`+${FRANC}250M`)
    expect(formatCurrency(-250_000_000, { compact: true, signed: true })).toBe(`−${FRANC}250M`)
  })

  it('keeps a negative balance unambiguous even when unsigned', () => {
    expect(formatCurrency(-1_450)).toBe(`−${FRANC}1,450`)
  })

  it('compacts on magnitude, so large negatives abbreviate too', () => {
    expect(formatCurrency(-1_250_000_000, { compact: true })).toBe(`−${FRANC}1.3B`)
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
