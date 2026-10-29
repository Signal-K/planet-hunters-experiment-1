import { stampDayKey, type ResearchStamps, type StampKind } from './stamps'

export type ResearchPathId = 'explorer' | 'trader'
export interface ResearchPathChoice { week: string; path: ResearchPathId; claimedSteps?: number[] }

const DAY_MS = 86_400_000

/** UTC day key of the Monday that starts the week containing `at`. Paths reset when this changes. */
export function weekKey(at: number): string {
  const offset = (new Date(at).getUTCDay() + 6) % 7
  return stampDayKey(at - offset * DAY_MS)
}

/** The path locked for this week, or null when the player has not chosen yet (or chose in an earlier week). */
export function pathThisWeek(choice: ResearchPathChoice | undefined, now: number): ResearchPathId | null {
  return choice && choice.week === weekKey(now) ? choice.path : null
}

export function choosePath<T extends { researchPath?: ResearchPathChoice }>(player: T, path: ResearchPathId, now: number): T {
  if (pathThisWeek(player.researchPath, now)) return player
  return { ...player, researchPath: { week: weekKey(now), path } }
}

export interface PathStep {
  id: string
  kind: StampKind
  /** Distinct days this week the player must stamp this kind. */
  days: number
  icon: 'signal' | 'scan' | 'world' | 'sky' | 'star'
  color: string
  title: string
  brief: string
  why: string
}

export const WEEKLY_RESEARCH_REWARDS: Record<string, { fragments: number; title: string; explanation: string }> = {
  'step-2': { fragments: 5, title: 'Field note', explanation: 'A small fragment for making the second connection.' },
  'step-4': { fragments: 10, title: 'Research cache', explanation: 'A larger fragment bundle for keeping the chain moving.' },
  breakthrough: { fragments: 25, title: 'Breakthrough', explanation: 'A permanent weekly badge and 25 regular fragments. The badge stays in your collection.' },
}

/** SSL-714: a shower with a mission chain words its event step for where the player is in it. */
export type EventStepCopy = { title: string; brief: string }

export function explorerSteps(opts: { hasDiscovery: boolean; eventName: string | null; eventStep?: EventStepCopy }): PathStep[] {
  const steps: PathStep[] = [
    { id: 'classify', kind: 'classification', days: 1, icon: 'signal', color: '#58d0ea', title: 'Classify a signal',
      brief: 'Open your instruments, pick something your telescopes found and say what it is.',
      why: 'Your answer joins everyone else’s, and that is how we learn what is really out there.' },
    { id: 'scan', kind: 'survey', days: 1, icon: 'scan', color: '#9ad28a', title: 'Finish a survey scan',
      brief: 'Start a scan from the control station and see it through to the result.',
      why: 'Scans show us how planets and generation behave, so worlds get more believable.' },
    { id: 'watch', kind: 'classification', days: 3, icon: 'signal', color: '#58d0ea', title: 'Keep watching: 3 days',
      brief: 'Classify a signal on three different days this week.',
      why: 'Signals repeat. Coming back is how a real discovery gets confirmed.' },
    opts.hasDiscovery
      ? { id: 'world', kind: 'discovery-mission', days: 1, icon: 'world', color: '#c9a7f0', title: 'Survey your discovery',
          brief: 'Fly a survey to a world you found yourself.', why: 'Your own find, checked up close. Nobody else can do this one for you.' }
      : { id: 'scan-again', kind: 'survey', days: 3, icon: 'scan', color: '#9ad28a', title: 'Scan on 3 days',
          brief: 'Finish a survey scan on three different days this week.', why: 'More scans, more of the picture. Finding a world of your own opens a special survey here.' },
    { id: 'breakthrough', kind: 'classification', days: 0, icon: 'star', color: '#f2c24c', title: 'Breakthrough',
      brief: 'Stamp research on five different days this week to finish the path.',
      why: 'A full week of steady research is what turns scattered reports into a result.' },
  ]
  if (opts.eventName) steps.splice(4, 0, {
    id: 'event', kind: 'event', days: 1, icon: 'sky', color: '#e8a24a', title: opts.eventStep?.title ?? `Catch debris in the ${opts.eventName}`,
    brief: opts.eventStep?.brief ?? 'Everyone is out there this week. Fly the shower run and bring a stamp home for the whole community.',
    why: 'Event weeks are shared research. Every player who joins fills the same bar.',
  })
  return steps
}

export function traderSteps(opts: { eventName: string | null; eventStep?: EventStepCopy }): PathStep[] {
  const steps: PathStep[] = [
    { id: 'sale', kind: 'exchange-sale', days: 1, icon: 'signal', color: '#58d0ea', title: 'Make an Exchange sale',
      brief: 'Sell one eligible mineral or refined good at the Exchange.',
      why: 'Real prices tell the community which resources are moving through the frontier.' },
    { id: 'contract', kind: 'contract-run', days: 1, icon: 'world', color: '#c9a7f0', title: 'Complete a contract run',
      brief: 'Take a client contract from the mission board and bring the run home.',
      why: 'Contracts show where supply is needed, not only what is available.' },
    { id: 'alert', kind: 'price-alert', days: 1, icon: 'scan', color: '#9ad28a', title: 'Set a price alert',
      brief: 'Open the Exchange alerts tab and set one useful price target.',
      why: 'Alerts turn a changing market into a signal you can act on.' },
    { id: 'sales', kind: 'exchange-sale', days: 3, icon: 'signal', color: '#58d0ea', title: 'Trade on 3 days',
      brief: 'Make Exchange sales on three different days this week.',
      why: 'A few steady trades reveal a better pattern than one lucky sale.' },
    { id: 'breakthrough', kind: 'contract-run', days: 0, icon: 'star', color: '#f2c24c', title: 'Breakthrough',
      brief: 'Complete the Trader chain to finish the path.',
      why: 'The full chain connects contracts, prices and player decisions into one market picture.' },
  ]
  if (opts.eventName) steps.splice(4, 0, {
    id: 'event', kind: 'event', days: 1, icon: 'sky', color: '#e8a24a', title: opts.eventStep?.title ?? `Catch debris in the ${opts.eventName}`,
    brief: opts.eventStep?.brief ?? 'Join the shared event run and bring a stamp home for the whole community.',
    why: 'Trader weeks can still contribute to shared sky research.'
  })
  return steps
}

export function weeklyRewardKey(step: PathStep): keyof typeof WEEKLY_RESEARCH_REWARDS | null {
  if (step.id === 'breakthrough') return 'breakthrough'
  if (step.id === 'scan' || step.id === 'contract') return 'step-2'
  if (step.id === 'sales' || step.id === 'scan-again' || step.id === 'world') return 'step-4'
  return null
}

export function claimResearchReward<T extends { researchPath?: ResearchPathChoice; researchFragments?: number; badges?: Record<string, { eventId: string; tier: 'gold' | 'silver'; earnedAt: number }> }>(player: T, step: PathStep, progress: { have: number; need: number }, now: number): T {
  const choice = player.researchPath
  const rewardKey = weeklyRewardKey(step)
  if (!choice || !rewardKey || progress.have < progress.need) return player
  const claimed = choice.claimedSteps ?? []
  const marker = step.id === 'breakthrough' ? 5 : step.id === 'scan' || step.id === 'contract' ? 2 : 4
  if (claimed.includes(marker)) return player
  const reward = WEEKLY_RESEARCH_REWARDS[rewardKey]
  const next = { ...player, researchPath: { ...choice, claimedSteps: [...claimed, marker] }, researchFragments: (player.researchFragments ?? 0) + reward.fragments }
  if (rewardKey === 'breakthrough') {
    const badgeId = `community-research-${choice.week}`
    next.badges = { ...(player.badges ?? {}), [badgeId]: { eventId: badgeId, tier: 'gold', earnedAt: now } }
  }
  return next
}

/** Progress of one step within the week starting at `week`, as `{have, need}`. The Breakthrough counts any stamped days. */
export function stepProgress(step: PathStep, stamps: ResearchStamps | undefined, week: string, now: number): { have: number; need: number } {
  const end = stampDayKey(now)
  const days = Object.keys(stamps ?? {}).filter(d => d >= week && d <= end)
  if (step.days === 0) return { have: Math.min(5, days.filter(d => (stamps?.[d] ?? []).length > 0).length), need: 5 }
  return { have: Math.min(step.days, days.filter(d => (stamps?.[d] ?? []).includes(step.kind)).length), need: step.days }
}
