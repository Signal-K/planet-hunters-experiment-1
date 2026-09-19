import { describe, expect, it } from 'vitest'
import { asteroidCandidatePayload, planSharedSubjectIngest, tessSubjectPayload } from './plan'
import type { NeocpSourceRow, TessToiSourceRow } from './types'

const openTess: TessToiSourceRow = {
  toi: '7001.01',
  ticId: '123',
  disposition: 'PC',
  periodDays: 4.1,
  depthPct: 0.12,
  starTeffK: 5300,
  sectors: '14',
}

const closedTess: TessToiSourceRow = { ...openTess, toi: '1017.01', disposition: 'FP' }

const openNeocp: NeocpSourceRow = {
  tempDesig: 'XL0918A',
  score: 88,
  discoveryDate: '2026-09-18',
  ra: 23.07,
  decl: -7.4,
  vMag: 19.8,
  hMag: 24.8,
  nObs: 3,
  arcDays: 0.01,
  lastSeenDays: 0.2,
}

describe('planSharedSubjectIngest', () => {
  it('inserts only new open rows and never reopens settled ones', () => {
    const plan = planSharedSubjectIngest(
      [openTess, closedTess, { ...openTess, toi: '7002.01' }],
      [openNeocp, { ...openNeocp, tempDesig: 'ZTF10GF' }],
      {
        tess: [
          { toiId: '7001.01', consensus: 'planet', goldLabel: '' },
        ],
        asteroids: [
          { tempDesig: 'XL0918A', resolved: true },
        ],
      },
      { tess: 10, neocp: 10 },
    )

    expect(plan.tessInserted.map(row => row.identity)).toEqual(['7002.01'])
    expect(plan.tessSkippedSettled).toBe(1)
    expect(plan.tessSkippedClosedSource).toBe(1)
    expect(plan.neocpInserted.map(row => row.identity)).toEqual(['ZTF10GF'])
    expect(plan.neocpSkippedSettled).toBe(1)
    expect(plan.tessInserted[0]?.payload).toMatchObject({ gold_label: '', consensus: '', subject_type: 'transit' })
    expect(plan.neocpInserted[0]?.payload).toMatchObject({ resolved: false })
    expect(plan.neocpInserted[0]?.payload).not.toHaveProperty('consensus')
    expect(plan.neocpInserted[0]?.payload).not.toHaveProperty('gold_label')
  })

  it('skips existing open rows instead of updating them', () => {
    const plan = planSharedSubjectIngest(
      [openTess],
      [openNeocp],
      {
        tess: [{ toiId: '7001.01', consensus: '', goldLabel: '' }],
        asteroids: [{ tempDesig: 'XL0918A', resolved: false }],
      },
    )
    expect(plan.tessInserted).toEqual([])
    expect(plan.neocpInserted).toEqual([])
    expect(plan.tessSkippedExisting).toBe(1)
    expect(plan.neocpSkippedExisting).toBe(1)
  })

  it('caps each source so one run cannot flood the pool', () => {
    const tess = Array.from({ length: 8 }, (_, index) => ({ ...openTess, toi: `80${index}.01` }))
    const neocp = Array.from({ length: 8 }, (_, index) => ({ ...openNeocp, tempDesig: `NEW${index}` }))
    const plan = planSharedSubjectIngest(tess, neocp, { tess: [], asteroids: [] }, { tess: 2, neocp: 3 })
    expect(plan.tessInserted).toHaveLength(2)
    expect(plan.neocpInserted).toHaveLength(3)
  })

  it('writes empty consensus on new TESS subjects and leaves asteroid consensus fields off', () => {
    expect(tessSubjectPayload(openTess).consensus).toBe('')
    expect(tessSubjectPayload(openTess).gold_label).toBe('')
    expect(asteroidCandidatePayload(openNeocp)).not.toHaveProperty('consensus')
    expect(asteroidCandidatePayload(openNeocp).resolved).toBe(false)
  })
})
