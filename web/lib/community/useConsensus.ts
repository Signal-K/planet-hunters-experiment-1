'use client'

import { useCallback, useEffect, useState } from 'react'
import { castConsensusVote, fetchConsensus, CommunityApiError } from './client'
import { consensusFixture, type ConsensusFixtureState } from './consensus.fixtures'
import type { ConsensusOverview, ConsensusVerdict } from './consensus'

export interface ConsensusHookState {
  overview: ConsensusOverview | null
  /** Set when a verdict is waiting in the offline outbox. */
  queued: boolean
  problem: string | null
  /** Records a verdict and takes the item out of the queue at once. */
  vote: (requestId: string, verdict: ConsensusVerdict, reason?: string) => Promise<boolean>
  reload: () => void
}

/** Dev only: `?consensus=queue|settled` shows a fixed set without an account. */
export function consensusFixtureState(): ConsensusFixtureState | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('consensus')
  return value === 'queue' || value === 'settled' || value === 'review' ? value : null
}

export function useConsensus(active: boolean): ConsensusHookState {
  const [overview, setOverview] = useState<ConsensusOverview | null>(null)
  const [queued, setQueued] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const load = useCallback(async () => {
    const fixture = consensusFixtureState()
    if (fixture) { setOverview(consensusFixture(fixture === 'review' ? 'queue' : fixture)); return }
    try { setOverview(await fetchConsensus()) } catch { /* offline or signed out: the area simply stays empty */ }
  }, [])

  useEffect(() => { if (active) void load() }, [active, load])

  const vote = useCallback(async (requestId: string, verdict: ConsensusVerdict, reason?: string) => {
    setProblem(null)
    setOverview(current => current && { ...current, queue: current.queue.filter(item => item.id !== requestId) })
    if (consensusFixtureState()) return true
    try {
      const result = await castConsensusVote(requestId, verdict, reason)
      setQueued(result.kind === 'queued')
      return true
    } catch (error) {
      setProblem(error instanceof CommunityApiError ? error.message : 'Your review could not be saved. Try again.')
      void load()
      return false
    }
  }, [load])

  return { overview, queued, problem, vote, reload: () => { void load() } }
}
