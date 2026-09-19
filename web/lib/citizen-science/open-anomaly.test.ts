import { describe, expect, it } from 'vitest'
import {
  ASTEROID_SETTLED_LABELS,
  REVIEWABLE_ASTEROID_CANDIDATE_FILTER,
  REVIEWABLE_TESS_SUBJECT_FILTER,
  TESS_SETTLED_LABELS,
  TESS_SUBJECT_SORT,
  isOpenConsensusValue,
  isSettledConsensusValue,
  recordHasOpenConsensus,
} from './open-anomaly'

describe('open-anomaly consensus', () => {
  it('treats unset and unsure as open, settled labels as closed', () => {
    expect(isOpenConsensusValue('', TESS_SETTLED_LABELS)).toBe(true)
    expect(isOpenConsensusValue(null, TESS_SETTLED_LABELS)).toBe(true)
    expect(isOpenConsensusValue('unsure', TESS_SETTLED_LABELS)).toBe(true)
    expect(isOpenConsensusValue('planet', TESS_SETTLED_LABELS)).toBe(false)
    expect(isOpenConsensusValue('not_planet', TESS_SETTLED_LABELS)).toBe(false)
    expect(isSettledConsensusValue('likely_real', ASTEROID_SETTLED_LABELS)).toBe(true)
    expect(isSettledConsensusValue('likely_artifact', ASTEROID_SETTLED_LABELS)).toBe(true)
    expect(isOpenConsensusValue('unsure', ASTEROID_SETTLED_LABELS)).toBe(true)
  })

  it('requires both consensus and gold_label to stay open', () => {
    expect(recordHasOpenConsensus({ consensus: '', gold_label: '' }, TESS_SETTLED_LABELS)).toBe(true)
    expect(recordHasOpenConsensus({ consensus: 'unsure', gold_label: '' }, TESS_SETTLED_LABELS)).toBe(true)
    expect(recordHasOpenConsensus({ consensus: 'planet', gold_label: '' }, TESS_SETTLED_LABELS)).toBe(false)
    expect(recordHasOpenConsensus({ consensus: '', gold_label: 'not_planet' }, TESS_SETTLED_LABELS)).toBe(false)
  })

  it('keeps the TESS PocketBase filter on existing consensus fields and sorts by id', () => {
    expect(REVIEWABLE_TESS_SUBJECT_FILTER).toContain('gold_label = ""')
    expect(REVIEWABLE_TESS_SUBJECT_FILTER).toContain('consensus = ""')
    expect(TESS_SUBJECT_SORT).toBe('id')
    expect(TESS_SUBJECT_SORT).not.toMatch(/created/)
  })

  it('does not put missing asteroid consensus fields in the PocketBase filter', () => {
    expect(REVIEWABLE_ASTEROID_CANDIDATE_FILTER).toBe('resolved = false')
    expect(REVIEWABLE_ASTEROID_CANDIDATE_FILTER).not.toMatch(/consensus|gold_label/)
  })
})
