import { stampDayKey, type ResearchStamps, type StampKind } from './stamps'

export type ResearchPathId = 'explorer' | 'trader'
export interface ResearchPathChoice { week: string; path: ResearchPathId }

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

export function explorerSteps(opts: { hasDiscovery: boolean; eventName: string | null }): PathStep[] {
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
    id: 'event', kind: 'event', days: 1, icon: 'sky', color: '#e8a24a', title: `Catch debris in the ${opts.eventName}`,
    brief: 'Everyone is out there this week. Fly the shower run and bring a stamp home for the whole community.',
    why: 'Event weeks are shared research. Every player who joins fills the same bar.',
  })
  return steps
}

/** Progress of one step within the week starting at `week`, as `{have, need}`. The Breakthrough counts any stamped days. */
export function stepProgress(step: PathStep, stamps: ResearchStamps | undefined, week: string, now: number): { have: number; need: number } {
  const end = stampDayKey(now)
  const days = Object.keys(stamps ?? {}).filter(d => d >= week && d <= end)
  if (step.days === 0) return { have: Math.min(5, days.filter(d => (stamps?.[d] ?? []).length > 0).length), need: 5 }
  return { have: Math.min(step.days, days.filter(d => (stamps?.[d] ?? []).includes(step.kind)).length), need: step.days }
}
