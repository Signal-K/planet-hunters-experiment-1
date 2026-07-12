/**
 * Review coverage for "Implement comments on classifications and
 * discoveries" (3qi9bp) — Landnam half. The ticket's Implementation
 * Evidence verified the backend/API contract via a live curl round-trip
 * against a throwaway PocketBase instance, but shipped no automated
 * regression test for this module. This covers the ticket's acceptance
 * criteria that live in `lib/comments.ts` itself: comment write requires an
 * authenticated user, and a comment record carries record_type/record_id.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const getFullList = vi.fn()
const create = vi.fn()

vi.mock('@/lib/pb', () => ({
  pbShared: {
    collection: vi.fn(() => ({ getFullList, create })),
    authStore: { record: null as { id: string } | null },
  },
}))

import { fetchComments, postComment } from '@/lib/comments'
import { pbShared } from '@/lib/pb'

describe('lib/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(pbShared.authStore as { record: { id: string } | null }).record = null
  })

  it('fetchComments filters by record_type + record_id and maps author name with an email/Unknown fallback', async () => {
    getFullList.mockResolvedValueOnce([
      {
        id: 'c1',
        record_type: 'classification',
        record_id: 'subj-1',
        author: 'user-1',
        body: 'nice find',
        created: '2026-07-11T00:00:00Z',
        expand: { author: { id: 'user-1', name: 'Ada' } },
      },
      {
        id: 'c2',
        record_type: 'classification',
        record_id: 'subj-1',
        author: 'user-2',
        body: 'agreed',
        created: '2026-07-11T00:01:00Z',
        expand: { author: { id: 'user-2', email: 'grace@example.com' } },
      },
      {
        id: 'c3',
        record_type: 'classification',
        record_id: 'subj-1',
        author: 'user-3',
        body: 'no expand data',
        created: '2026-07-11T00:02:00Z',
      },
    ])

    const comments = await fetchComments('classification', 'subj-1')

    expect(getFullList).toHaveBeenCalledWith(
      expect.objectContaining({ filter: 'record_type = "classification" && record_id = "subj-1"' }),
    )
    expect(comments).toEqual([
      expect.objectContaining({ id: 'c1', recordType: 'classification', recordId: 'subj-1', authorName: 'Ada' }),
      expect.objectContaining({ id: 'c2', authorName: 'grace@example.com' }),
      expect.objectContaining({ id: 'c3', authorName: 'Unknown' }),
    ])
  })

  it('rejects posting a comment when no user is signed in — required auth per the accepted spec', async () => {
    await expect(postComment('classification', 'subj-1', 'hello')).rejects.toThrow(/signed in/i)
    expect(create).not.toHaveBeenCalled()
  })

  it('attaches record_type, record_id, and the authenticated author id when signed in', async () => {
    ;(pbShared.authStore as { record: { id: string } | null }).record = { id: 'user-42' }
    create.mockResolvedValueOnce({
      id: 'c9',
      record_type: 'classification',
      record_id: 'subj-9',
      author: 'user-42',
      body: 'great catch',
      created: '2026-07-11T00:03:00Z',
    })

    const comment = await postComment('classification', 'subj-9', 'great catch')

    expect(create).toHaveBeenCalledWith({
      record_type: 'classification',
      record_id: 'subj-9',
      author: 'user-42',
      body: 'great catch',
    })
    expect(comment).toMatchObject({ id: 'c9', recordType: 'classification', recordId: 'subj-9', authorId: 'user-42' })
  })
})
