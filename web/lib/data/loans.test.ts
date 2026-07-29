import { describe, it, expect } from 'vitest'
import { loanInstalmentFor, LOAN_PRINCIPAL, LOAN_DEBT_ON_ACCEPT } from './loans'

describe('loanInstalmentFor', () => {
  it('is zero with no debt', () => {
    expect(loanInstalmentFor(0)).toBe(0)
    expect(loanInstalmentFor(undefined)).toBe(0)
    expect(loanInstalmentFor(-1)).toBe(0)
  })

  it('clears the whole debt in one debrief', () => {
    // The Debrief line must say "debt cleared", not imply an instalment plan.
    expect(loanInstalmentFor(LOAN_DEBT_ON_ACCEPT)).toBe(LOAN_DEBT_ON_ACCEPT)
    expect(loanInstalmentFor(9_999_999_999)).toBe(9_999_999_999)
  })

  it('books principal plus one flat interest charge', () => {
    expect(LOAN_DEBT_ON_ACCEPT).toBe(LOAN_PRINCIPAL * 1.08)
  })
})
