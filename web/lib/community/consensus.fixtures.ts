import type { ConsensusOverview } from './consensus'

/**
 * Account-free stage fixtures for the consensus tab
 * (`/game/stage?preset=ui-community-research&consensus=queue|settled`). They mirror what
 * pocketbase/consensus.go returns.
 */
const rows = (verdict: string) => ({
  verdict,
  rows: [
    { label: 'Star', value: 'TOI-4219 · TIC 260004324' },
    { label: 'Marks', value: '3' },
    { label: 'Dip 1', value: '2.41d · 3.2h · 4.10ppt' },
    { label: 'Fold', value: 'P 5.07d' },
    { label: 'Verdict', value: verdict },
  ],
})

export type ConsensusFixtureState = 'queue' | 'settled' | 'review'

/** A reviewer who has done their own work, with the requester's readout released. */
export const REVIEW_FIXTURE_READOUT = rows('TRANSIT')
export const REVIEW_FIXTURE_OWN = { verdict: 'TRANSIT', rows: [{ label: 'Star', value: 'TIC 150428135' }, { label: 'Marks', value: '2' }, { label: 'Dip 1', value: '2.38d · 3.0h · 3.90ppt' }, { label: 'Fold', value: 'P 5.02d' }, { label: 'Verdict', value: 'TRANSIT' }] }

export function consensusFixture(state: ConsensusFixtureState): ConsensusOverview {
  const now = Date.now()
  const hour = 3_600_000
  const iso = (ago: number) => new Date(now - ago * hour).toISOString()
  return {
    required: 4,
    activePlayers: 9,
    mine: [
      { id: 'c1', project: 'tess', subjectId: 'TIC 260004324', state: state === 'settled' ? 'verified' : 'open', supports: state === 'settled' ? 4 : 2, disputes: state === 'settled' ? 1 : 0, unsure: 0, required: 4, readout: rows('TRANSIT'), reviews: [], createdAt: iso(30) },
      { id: 'c2', project: 'asteroid', subjectId: '2026 TM9', state: state === 'settled' ? 'disputed' : 'open', supports: state === 'settled' ? 1 : 0, disputes: state === 'settled' ? 4 : 0, unsure: 0, required: 4, readout: null, reviews: [], createdAt: iso(52) },
    ],
    queue: state === 'settled' ? [] : [
      { id: 'q1', project: 'tess', subjectId: 'TIC 150428135', createdAt: iso(2), revealed: false },
      { id: 'q2', project: 'saturn', subjectId: 'Saturn 2026-10-31', createdAt: iso(9), revealed: false },
    ],
  }
}
