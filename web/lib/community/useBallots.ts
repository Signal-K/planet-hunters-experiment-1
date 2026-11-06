'use client'

import { useCallback, useEffect, useState } from 'react'
import { castVote, fetchBallots, CommunityApiError } from './client'
import { ballotFixture, type BallotFixtureState } from './ballots.fixtures'
import type { Ballot } from './ballots'

export interface BallotsState {
  ballots: Ballot[] | null
  /** Server time at the last load, so the closing label does not depend on the device clock. */
  serverNow: number
  /** Set when a vote is waiting in the offline outbox. */
  queued: boolean
  /** A short sentence when the last vote could not be saved. */
  problem: string | null
  vote: (ballotKey: string, optionId: string) => void
}

/** Dev only: `?ballots=open|voted|closed` shows a fixed ballot set without an account. */
function fixtureState(): BallotFixtureState | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('ballots')
  return value === 'open' || value === 'voted' || value === 'closed' ? value : null
}

export function useBallots(active: boolean): BallotsState {
  const [ballots, setBallots] = useState<Ballot[] | null>(null)
  const [serverNow, setServerNow] = useState(() => Date.now())
  const [queued, setQueued] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const load = useCallback(async () => {
    const fixture = fixtureState()
    if (fixture) {
      const res = ballotFixture(fixture, Date.now())
      setBallots(res.ballots); setServerNow(res.now)
      return
    }
    try {
      const res = await fetchBallots()
      setBallots(res.ballots); setServerNow(res.now)
    } catch { /* offline or signed out: the ballots simply do not show */ }
  }, [])

  useEffect(() => {
    if (!active) return
    void load()
  }, [active, load])

  const vote = useCallback((ballotKey: string, optionId: string) => {
    setProblem(null)
    // Show the choice at once; the server answer replaces it with the real totals.
    setBallots(current => current && current.map(b => b.key === ballotKey ? { ...b, myVote: optionId } : b))
    if (fixtureState()) return
    castVote(ballotKey, optionId)
      .then(result => {
        if (result.kind === 'queued') { setQueued(true); return }
        setQueued(false)
        setBallots(current => current && current.map(b => b.key === ballotKey ? result.ballot : b))
      })
      .catch(error => {
        setProblem(error instanceof CommunityApiError && error.status === 400 ? 'Voting has closed for this ballot.' : 'Your vote could not be saved. Try again.')
        void load()
      })
  }, [load])

  return { ballots, serverNow, queued, problem, vote }
}
