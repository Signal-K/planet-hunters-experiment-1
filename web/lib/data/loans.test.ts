import { describe, it, expect } from 'vitest'
import { loanInstalmentFor, LOAN_PRINCIPAL } from './loans'

describe('loanInstalmentFor', () => {
  it('is zero with no debt', () => {
    expect(loanInstalmentFor(0)).toBe(0)
    expect(loanInstalmentFor(undefined)).toBe(0)
    expect(loanInstalmentFor(-1)).toBe(0)
  })

  it('clears the whole debt in one debrief', () => {
    // The Debrief line must say "debt cleared", not imply an instalment plan.
    // The treasury loan is principal-only, no interest — see TreasurySystem.
    expect(loanInstalmentFor(LOAN_PRINCIPAL)).toBe(LOAN_PRINCIPAL)
    expect(loanInstalmentFor(9_999_999_999)).toBe(9_999_999_999)
  })
})
