import { describe, it, expect, vi } from 'vitest'

const getFullList = vi.fn()

vi.mock('@/lib/pb', () => ({
  pbShared: {
    collection: vi.fn(() => ({ getFullList })),
  },
}))

import { REVIEWABLE_ASTEROID_CANDIDATE_FILTER, fetchReviewableAsteroidCandidates } from '@/lib/asteroid-subjects'

describe('fetchReviewableAsteroidCandidates', () => {
  it('filters unresolved rows and drops settled consensus client-side', async () => {
    getFullList.mockResolvedValueOnce([
      { id: 'open-1', temp_desig: 'XL0918A', resolved: false, consensus: '', gold_label: '' },
      { id: 'settled-resolved', temp_desig: 'ZTF10GF', resolved: true, consensus: '', gold_label: '' },
      { id: 'settled-consensus', temp_desig: 'CETVWY2', resolved: false, consensus: 'likely_real', gold_label: '' },
      { id: 'settled-gold', temp_desig: 'CETVTU2', resolved: false, consensus: '', gold_label: 'likely_artifact' },
    ])

    const candidates = await fetchReviewableAsteroidCandidates()
    expect(getFullList).toHaveBeenCalledWith(expect.objectContaining({
      filter: REVIEWABLE_ASTEROID_CANDIDATE_FILTER,
    }))
    expect(REVIEWABLE_ASTEROID_CANDIDATE_FILTER).toBe('resolved = false')
    expect(REVIEWABLE_ASTEROID_CANDIDATE_FILTER).not.toMatch(/consensus|gold_label/)
    expect(candidates.map(candidate => candidate.id)).toEqual(['open-1'])
  })
})
