// SSL-757: community ballots on the Community research screen. The server owns the
// ballot content, the closing time and the tallies (pocketbase/ballots.go). This file
// holds the shared shapes and the small pure helpers the screen needs.

export type BallotCategory = 'astronomy' | 'launch'
export type BallotPhase = 'pending' | 'open' | 'closed'

export interface BallotPolicy {
  /** What the community builds next if this option wins. */
  template: 'observatory-instrument' | 'spaceport-launch-site' | string
  focusRef: string
}

export interface BallotOption {
  id: string
  label: string
  detail: string
  /** YYYY-MM-DD, UTC. */
  windowStart: string
  windowEnd?: string
  sourceLabel: string
  sourceUrl: string
  /** YYYY-MM-DD the dates were checked against a second source. Missing means not confirmed. */
  verifiedAt?: string
  policy: BallotPolicy
}

export interface Ballot {
  key: string
  category: BallotCategory
  title: string
  blurb: string
  disclaimer: string
  phase: BallotPhase
  opensAt: number
  closesAt: number
  defaultOption?: string
  options: BallotOption[]
  myVote?: string
  /** Withheld by the server until the player has voted or the ballot is closed. */
  counts?: Record<string, number>
  total?: number
  winner?: string
}

export interface BallotsResponse { ballots: Ballot[]; now: number }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dayLabel(key: string): string {
  const [, m, d] = key.split('-').map(Number)
  return `${d} ${MONTHS[(m || 1) - 1]}`
}

/** "13–15 Dec", "11 Feb 2027". The year is shown only when it is not this year. */
export function windowLabel(option: Pick<BallotOption, 'windowStart' | 'windowEnd'>, now: number): string {
  const year = new Date(now).getUTCFullYear()
  const startYear = Number(option.windowStart.slice(0, 4))
  const suffix = startYear !== year ? ` ${startYear}` : ''
  if (!option.windowEnd || option.windowEnd === option.windowStart) return `${dayLabel(option.windowStart)}${suffix}`
  const [, sm] = option.windowStart.split('-').map(Number)
  const [, em, ed] = option.windowEnd.split('-').map(Number)
  // The end date is exclusive in the calendar sources (a two-day window ends on the third),
  // so the last day shown is the day before it.
  const last = new Date(Date.UTC(Number(option.windowEnd.slice(0, 4)), em - 1, ed - 1))
  const lastDay = last.getUTCDate()
  const sameMonth = last.getUTCMonth() === sm - 1
  return sameMonth
    ? `${Number(option.windowStart.slice(8, 10))}–${lastDay} ${MONTHS[sm - 1]}${suffix}`
    : `${dayLabel(option.windowStart)} – ${lastDay} ${MONTHS[last.getUTCMonth()]}${suffix}`
}

/** "Closes in 4 days", "Closes in 5 hours", "Closes soon". Closed ballots return "Closed". */
export function closesLabel(closesAt: number, now: number): string {
  const left = closesAt - now
  if (!closesAt || left <= 0) return 'Closed'
  const hours = Math.floor(left / 3_600_000)
  if (hours >= 48) return `Closes in ${Math.floor(hours / 24)} days`
  if (hours >= 2) return `Closes in ${hours} hours`
  return 'Closes soon'
}

/** Whole-number share of the vote for one option, 0 when nobody has voted. */
export function voteShare(ballot: Pick<Ballot, 'counts' | 'total'>, optionId: string): number {
  const total = ballot.total ?? 0
  if (!total) return 0
  return Math.round(((ballot.counts?.[optionId] ?? 0) / total) * 100)
}

export function optionById(ballot: Pick<Ballot, 'options'>, id: string | undefined): BallotOption | null {
  return id ? ballot.options.find(o => o.id === id) ?? null : null
}

/** What the community builds next, in the words the player sees. */
export function policyLabel(policy: BallotPolicy): string {
  return policy.template === 'spaceport-launch-site' ? 'Community Spaceport' : 'Community Observatory'
}
