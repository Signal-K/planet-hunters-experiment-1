import { describe, expect, it } from 'vitest'
import { stateLabel } from './consensus'

describe('consensus stateLabel', () => {
  const base = { supports: 0, disputes: 0, required: 4 }
  it('says what a requester is waiting for', () => {
    expect(stateLabel({ ...base, state: 'open' })).toBe('Waiting for reviewers')
    expect(stateLabel({ ...base, state: 'open', supports: 2 })).toBe('2 of 4 supports')
    expect(stateLabel({ ...base, state: 'verified', supports: 4 })).toBe('Verified')
    expect(stateLabel({ ...base, state: 'disputed', disputes: 4 })).toBe('Disputed')
  })
})
