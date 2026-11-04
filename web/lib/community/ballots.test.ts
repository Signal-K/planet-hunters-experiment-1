import { describe, expect, it } from 'vitest'
import { ballotFixture } from './ballots.fixtures'
import { closesLabel, optionById, policyLabel, voteShare, windowLabel } from './ballots'

const NOV_4 = Date.UTC(2026, 10, 4, 12)

describe('ballot labels', () => {
  it('formats a multi-day window with the last day inclusive', () => {
    expect(windowLabel({ windowStart: '2026-12-13', windowEnd: '2026-12-15' }, NOV_4)).toBe('13–14 Dec')
  })
  it('shows the year only when it is not this year', () => {
    expect(windowLabel({ windowStart: '2027-02-11' }, NOV_4)).toBe('11 Feb 2027')
    expect(windowLabel({ windowStart: '2026-11-10' }, NOV_4)).toBe('10 Nov')
  })
  it('counts down to the close', () => {
    expect(closesLabel(NOV_4 + 4 * 86_400_000, NOV_4)).toBe('Closes in 4 days')
    expect(closesLabel(NOV_4 + 5 * 3_600_000, NOV_4)).toBe('Closes in 5 hours')
    expect(closesLabel(NOV_4 + 600_000, NOV_4)).toBe('Closes soon')
    expect(closesLabel(NOV_4 - 1, NOV_4)).toBe('Closed')
  })
})

describe('ballot fixtures', () => {
  it('hide counts until voted, show them after, and name a winner when closed', () => {
    const open = ballotFixture('open', NOV_4).ballots[0]
    expect(open.counts).toBeUndefined()
    const voted = ballotFixture('voted', NOV_4).ballots[0]
    expect(voteShare(voted, 'jupiter-opposition-2027')).toBe(50)
    const closed = ballotFixture('closed', NOV_4).ballots[0]
    expect(closed.phase).toBe('closed')
    expect(optionById(closed, closed.winner)?.label).toBe('Jupiter at opposition')
    expect(policyLabel(optionById(closed, closed.winner)!.policy)).toBe('Community Observatory')
  })
  it('keeps the launch ballot pending with Electron as the default', () => {
    const launch = ballotFixture('open', NOV_4).ballots[1]
    expect(launch.phase).toBe('pending')
    expect(optionById(launch, launch.defaultOption)?.verifiedAt).toBeUndefined()
    expect(policyLabel(launch.options[0].policy)).toBe('Community Spaceport')
  })
  it('returns zero share when nobody has voted', () => {
    expect(voteShare({}, 'x')).toBe(0)
  })
})
