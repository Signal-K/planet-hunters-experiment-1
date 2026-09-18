/**
 * Regression coverage for SSL-10: the shared `subjects` collection does not
 * define `created`/`updated` as columns, so sorting on either is a hard 400
 * from PocketBase. This stubs getFullList to reject exactly the way
 * PocketBase does when it sees a sort on an undefined field, so the test
 * fails if the query ever reverts to `sort: '-created'`.
 */

import { describe, it, expect, vi } from 'vitest'

const getFullList = vi.fn((options: { sort?: string }) => {
  if (options.sort && options.sort !== 'id') {
    return Promise.reject(new Error(`400: cannot sort by unknown field "${options.sort}"`))
  }
  return Promise.resolve([])
})

vi.mock('@/lib/pb', () => ({
  pbShared: {
    collection: vi.fn(() => ({ getFullList })),
  },
}))

import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'

describe('fetchReviewableTessCandidates', () => {
  it('sorts by id, not created, since subjects does not define created/updated', async () => {
    await expect(fetchReviewableTessCandidates()).resolves.toEqual([])
    expect(getFullList).toHaveBeenCalledWith(expect.objectContaining({ sort: 'id' }))
  })
})
