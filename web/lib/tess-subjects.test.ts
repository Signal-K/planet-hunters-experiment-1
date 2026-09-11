import { describe, it, expect, vi } from 'vitest'

// Stand-in for the shared backend's `subjects` collection as it actually
// exists in production: no `created`/`updated` autodate fields. PocketBase
// rejects a sort on a field the collection does not define, so this stub
// mirrors that 400 instead of quietly ignoring the option — that rejection is
// what the screen surfaced as "Live Feed Unavailable" for every player on
// every visit (KES-358).
const SUBJECT_FIELDS = [
  'id', 'tic_id', 'toi_id', 'sectors', 'subject_type', 'lightcurve_points',
  'period_days', 'depth_pct', 'duration_hrs', 'is_calibration', 'gold_label',
  'vote_count', 'unsure_count', 'consensus', 'planet_vote_count', 'confirmed',
  'confirmed_at', 'st_teff',
]

const RECORDS = [
  { id: 'b', toi_id: '101.01', tic_id: '11', subject_type: 'transit', gold_label: '', consensus: '' },
  { id: 'a', toi_id: '102.01', tic_id: '12', subject_type: 'transit', gold_label: '', consensus: 'unsure' },
  { id: 'c', toi_id: '103.01', tic_id: '13', subject_type: 'transit', gold_label: 'planet', consensus: 'planet' },
]

interface ListOptions { filter?: string; sort?: string; requestKey?: unknown }

const lastOptions: ListOptions[] = []

const getFullList = vi.fn(async (opts?: ListOptions) => {
  const options = opts ?? {}
  lastOptions.push(options)
  for (const key of (options.sort ?? '').split(',').filter(Boolean)) {
    if (!SUBJECT_FIELDS.includes(key.replace(/^[-+]/, ''))) {
      throw Object.assign(new Error('Something went wrong while processing your request.'), { status: 400 })
    }
  }
  return RECORDS
})

vi.mock('@/lib/pb', () => ({ pbShared: { collection: () => ({ getFullList }) } }))

describe('fetchReviewableTessCandidates', () => {
  it('only sorts on fields the subjects collection actually defines', async () => {
    const { fetchReviewableTessCandidates } = await import('@/lib/tess-subjects')
    // A sort the backend rejects would reject here too, exactly as production did.
    await expect(fetchReviewableTessCandidates()).resolves.toBeInstanceOf(Array)

    const sort = lastOptions[lastOptions.length - 1].sort ?? ''
    expect(sort).not.toBe('')
    for (const key of sort.split(',')) {
      expect(SUBJECT_FIELDS).toContain(key.replace(/^[-+]/, ''))
    }
  })

  it('drops subjects that are already resolved, and keeps the backend order', async () => {
    const { fetchReviewableTessCandidates } = await import('@/lib/tess-subjects')
    const candidates = await fetchReviewableTessCandidates()
    expect(candidates.map(candidate => candidate.id)).toEqual(['b', 'a'])
  })

  it('opts out of request-key auto-cancellation so parallel consumers do not abort each other', async () => {
    const { fetchReviewableTessCandidates } = await import('@/lib/tess-subjects')
    await fetchReviewableTessCandidates()
    expect(lastOptions[lastOptions.length - 1].requestKey).toBeNull()
  })
})
