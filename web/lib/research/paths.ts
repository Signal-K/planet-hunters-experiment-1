import { stampDayKey, type ResearchStamps, type StampKind } from './stamps'
import { asteroidFeedOnline } from '@/lib/systems/InstrumentFeedSystem'
import { markMapped, type SkyAim, type SkyMap } from './sky-map'

export type ResearchPathId = 'explorer' | 'trader' | 'agency'
export type InstrumentPointing = 'transit' | 'deep-space' | 'saturn'
export type TelescopeAim = Partial<Record<InstrumentPointing, { week: string; aim?: SkyAim; /** Saturn only: the sector the orbiter was steered to (SkyTarget id). */ sector?: string }>>
export interface ResearchPathChoice { week: string; path: ResearchPathId; claimedSteps?: number[]; pointing?: InstrumentPointing; /** Where in the sky the week's instrument was locked (SSL-788). */ aim?: SkyAim }

/** What an Explorer can aim their instruments at for the week. */
export const POINTING_OPTIONS: { id: InstrumentPointing; label: string; note: string }[] = [
  { id: 'transit', label: 'Planet transits', note: 'Stars that dim as a world crosses them.' },
  { id: 'deep-space', label: 'Moving objects', note: 'Asteroids drifting across the deep sky.' },
  { id: 'saturn', label: 'Saturn storms', note: 'Cassini images of Saturn’s rings and clouds.' },
]

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

export function choosePath<T extends { researchPath?: ResearchPathChoice }>(player: T, path: ResearchPathId, now: number, pointing?: InstrumentPointing): T {
  if (pathThisWeek(player.researchPath, now)) return player
  return { ...player, researchPath: { week: weekKey(now), path, ...(path === 'explorer' && pointing ? { pointing } : {}) } }
}

/** A launched telescope is pointed once a week. The lock marks the sky field it falls in on the player's sky map. */
export function pointTelescope<T extends { telescopeAim?: TelescopeAim; skyMap?: SkyMap }>(player: T, instrument: InstrumentPointing, now: number, aim?: SkyAim, sector?: string): T {
  const week = weekKey(now)
  if (player.telescopeAim?.[instrument]?.week === week) return player
  return {
    ...player,
    telescopeAim: { ...(player.telescopeAim ?? {}), [instrument]: { week, ...(aim ? { aim } : {}), ...(sector ? { sector } : {}) } },
    ...(aim && instrument !== 'saturn' ? { skyMap: markMapped(player.skyMap, aim, week, instrument) } : {}),
  }
}

const SATURN_SECTOR_NAMES: Record<string, string> = { pole: 'North polar hexagon', band: 'Storm band', ring: 'Encke gap', free: 'Open view' }

/** The sector of Saturn the player steered the orbiter to this week, or null (context only: frames are not filtered by it). */
export function saturnSectorName(player: { telescopeAim?: TelescopeAim }, now: number): string | null {
  const aim = player.telescopeAim?.saturn
  return aim && aim.week === weekKey(now) && aim.sector ? (SATURN_SECTOR_NAMES[aim.sector] ?? null) : null
}

export interface TelescopeOwner { freeOperations?: boolean; transitSatelliteLaunchedAt?: number | null; saturnImagerLaunchedAt?: number | null; deepSpaceTelescopeBuilt?: boolean; placed?: readonly string[]; telescopeAim?: TelescopeAim }

/** Telescopes the player has launched or built, in the order they are offered. */
export function onlineTelescopes(player: TelescopeOwner): InstrumentPointing[] {
  return [
    ...(player.freeOperations && player.transitSatelliteLaunchedAt ? ['transit' as const] : []),
    ...(asteroidFeedOnline(player) ? ['deep-space' as const] : []),
    ...(player.freeOperations && player.saturnImagerLaunchedAt ? ['saturn' as const] : []),
  ]
}

/** Telescopes that are online and not yet pointed this week. These are what the sky asks the player to position. */
export function telescopesNeedingPointing(player: TelescopeOwner, now: number): InstrumentPointing[] {
  const week = weekKey(now)
  return onlineTelescopes(player).filter(id => player.telescopeAim?.[id]?.week !== week)
}

/** Telescopes the player pointed this week. */
export function pointedThisWeek(telescopeAim: TelescopeAim | undefined, now: number): InstrumentPointing[] {
  const week = weekKey(now)
  return (Object.keys(telescopeAim ?? {}) as InstrumentPointing[]).filter(id => telescopeAim?.[id]?.week === week)
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
  'step-2': { fragments: 5, title: 'Field note', explanation: '5 fragments for making the second connection.' },
  'step-4': { fragments: 10, title: 'Research cache', explanation: '10 fragments for keeping the chain moving.' },
  breakthrough: { fragments: 25, title: 'Breakthrough', explanation: 'A permanent weekly badge and 25 fragments. The shared passport goal awards this week’s rocket part.' },
}

/** SSL-714: a shower with a mission chain words its event step for where the player is in it. */
export type EventStepCopy = { title: string; brief: string }

/** SSL-773: with a survey probe in orbit, downloading its newly mapped sectors is a step on either path, just before the Breakthrough. */
const PROBE_STEP: PathStep = {
  id: 'probe', kind: 'probe-observation', days: 1, icon: 'world', color: '#c9a7f0', title: 'Check your probe survey',
  brief: 'Open your survey probe in the data hub when it has mapped new sectors, to download the deposits it found.',
  why: 'Up-close readings show where the deposits really are, for everyone planning a mine.',
}

function withProbeStep(steps: PathStep[], hasProbe: boolean | undefined): PathStep[] {
  if (!hasProbe) return steps
  const at = steps.findIndex(step => step.id === 'breakthrough')
  return [...steps.slice(0, at), PROBE_STEP, ...steps.slice(at)]
}

export function explorerSteps(opts: { hasDiscovery: boolean; eventName: string | null; eventStep?: EventStepCopy; hasProbe?: boolean; hasInstrument?: boolean }): PathStep[] {
  const steps: PathStep[] = [
    { id: 'classify', kind: opts.hasInstrument === false ? 'launch' : 'classification', days: 1, icon: 'signal', color: '#58d0ea', title: opts.hasInstrument === false ? 'Build or launch your first telescope' : 'Classify a signal',
      brief: opts.hasInstrument === false ? 'Your agency needs an instrument first. Build a ground telescope in the Data hub, place it on the Base, then work its daily candidates.' : 'Open your instruments, pick something your telescopes found and say what it is.',
      why: 'Your answer joins everyone else’s, and that is how we learn what is really out there.' },
    { id: 'scan', kind: opts.hasProbe ? 'probe-observation' : 'launch', days: 1, icon: 'scan', color: '#9ad28a', title: opts.hasProbe ? 'Download your probe survey' : 'Launch a survey probe',
      brief: opts.hasProbe ? 'Download newly mapped sectors in the Data hub. These are actual readings from your orbiting probe.' : 'Launch a probe from Program, then download the sectors it maps from the Data hub.',
      why: 'Scans show us how planets and generation behave, so worlds get more believable.' },
    { id: 'watch', kind: 'classification', days: 3, icon: 'signal', color: '#58d0ea', title: 'Keep watching: 3 days',
      brief: 'Classify a signal on three different days this week.',
      why: 'Signals repeat. Coming back is how a real discovery gets confirmed.' },
    { id: 'review', kind: 'review', days: 1, icon: 'signal', color: '#f2c24c', title: 'Review a finding',
      brief: 'Open Community research, check another player’s finding with your own look, then Support, Dispute or Unsure.',
      why: 'A finding is only verified when other players agree. Consensus is the community’s goal.' },
    opts.hasDiscovery
      ? { id: 'world', kind: 'discovery-mission', days: 1, icon: 'world', color: '#c9a7f0', title: 'Survey your discovery',
          brief: 'Fly a survey to a world you found yourself.', why: 'Your own find, checked up close. Nobody else can do this one for you.' }
      : { id: 'scan-again', kind: 'probe-observation', days: 3, icon: 'scan', color: '#9ad28a', title: 'Download surveys on 3 days',
          brief: 'Download fresh probe readings on three different days this week.', why: 'More scans, more of the picture. Finding a world of your own opens a special survey here.' },
    { id: 'breakthrough', kind: 'classification', days: 0, icon: 'star', color: '#f2c24c', title: 'Breakthrough',
      brief: 'Stamp research on five different days this week to finish the path.',
      why: 'A full week of steady research is what turns scattered reports into a result.' },
  ]
  // SSL-775: while a shower is live its step leads the path.
  if (opts.eventName) steps.unshift({
    id: 'event', kind: 'event', days: 1, icon: 'sky', color: '#e8a24a', title: opts.eventStep?.title ?? `Catch debris in the ${opts.eventName}`,
    brief: opts.eventStep?.brief ?? 'Everyone is out there this week. Fly the shower run and bring a stamp home for the whole community.',
    why: 'Event weeks are shared research. Every player who joins fills the same bar.',
  })
  return withProbeStep(steps, opts.hasProbe)
}

export function traderSteps(opts: { eventName: string | null; eventStep?: EventStepCopy; hasProbe?: boolean }): PathStep[] {
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
  // SSL-775: while a shower is live its step leads the path.
  if (opts.eventName) steps.unshift({
    id: 'event', kind: 'event', days: 1, icon: 'sky', color: '#e8a24a', title: opts.eventStep?.title ?? `Catch debris in the ${opts.eventName}`,
    brief: opts.eventStep?.brief ?? 'Join the shared event run and bring a stamp home for the whole community.',
    why: 'Trader weeks can still contribute to shared sky research.'
  })
  return withProbeStep(steps, opts.hasProbe)
}

/**
 * SSL-852: the Agency path is built from the agency programme (lib/agency/programme.ts): put a craft up, work the
 * data it sends, and have a finding checked. `nextLaunch` is the craft to launch or build next; with nothing left
 * to add, the step is a survey scan. `hasData` is false until a craft sends data to classify.
 */
export function agencySteps(opts: { eventName: string | null; eventStep?: EventStepCopy; hasProbe?: boolean; nextLaunch: { name: string; how: 'launch' | 'build'; project: string; /** False when another craft already feeds this project. */ opensProject: boolean; adds: string } | null; hasData: boolean; ownedNames: string[]; /** A craft already went up this week: the step keeps saying so, not naming the next one as done. */ launchedThisWeek?: boolean; /** SSL-852: a worn craft comes before anything new. */ service?: { name: string; percent: number; failed: boolean } | null }): PathStep[] {
  const fleet = opts.ownedNames.length ? opts.ownedNames.join(', ').toLowerCase() : null
  const service = !opts.launchedThisWeek ? opts.service : null
  const first: PathStep = service
    ? { id: 'launch', kind: 'launch', days: 1, icon: 'star', color: 'var(--ln-board-gold)', title: `Service the ${service.name.replace(/^Space/, 'space')}`,
        brief: `Your ${service.name.replace(/^Space/, 'space')} is at ${service.percent}%${service.failed ? ' and has failed: it sends nothing' : ''}. Fly its servicing mission from the Program tab to put it back to full.`,
        why: 'Use and real solar storms wear craft down. An agency that keeps its craft working keeps the data coming for everyone.' }
    : opts.launchedThisWeek
    ? { id: 'launch', kind: 'launch', days: 1, icon: 'star', color: 'var(--ln-board-gold)', title: 'Add a craft to your fleet',
        brief: opts.nextLaunch ? `Your agency put a craft up this week. Next you could ${opts.nextLaunch.how === 'build' ? 'build' : 'launch'} a ${opts.nextLaunch.name.toLowerCase()} for ${opts.nextLaunch.project}.` : 'Your agency put a craft up this week.',
        why: 'Every craft an agency puts up is more of the sky being watched, and more data for everyone to work through.' }
    : opts.nextLaunch
    ? { id: 'launch', kind: 'launch', days: 1, icon: 'star', color: 'var(--ln-board-gold)', title: `${opts.nextLaunch.how === 'build' ? 'Build' : 'Launch'} a ${opts.nextLaunch.name.toLowerCase()}`,
        brief: `${opts.nextLaunch.how === 'build' ? 'Build it in the Data hub and place it on the Base' : 'Fly it from the launchpad, on the Program tab'}. It ${opts.nextLaunch.opensProject ? `opens ${opts.nextLaunch.project} for your agency` : `adds to ${opts.nextLaunch.project}`}: ${opts.nextLaunch.adds.charAt(0).toLowerCase()}${opts.nextLaunch.adds.slice(1)}.`,
        why: 'Every craft an agency puts up is more of the sky being watched, and more data for everyone to work through.' }
    : { id: 'scan', kind: 'survey', days: 1, icon: 'scan', color: 'var(--ln-payout)', title: 'Finish a survey scan',
        brief: 'Your fleet is complete. Start a scan from the Data hub and see it through to the result.',
        why: 'Scans show us how planets and generation behave, so worlds get more believable.' }
  const steps: PathStep[] = [
    first,
    { id: 'fleet-classify', kind: 'classification', days: 1, icon: 'signal', color: 'var(--ln-cyan)', title: 'Work your fleet\u2019s data',
      brief: opts.hasData && fleet ? `Your ${fleet} sent data today. Open the Data hub, pick an item and say what it is.` : 'Nothing is sending data yet. Launch or build a telescope first, then classify what it sends.',
      why: 'Data only counts once someone has looked at it. Your answer joins every other player\u2019s.' },
    { id: 'fleet-watch', kind: 'classification', days: 3, icon: 'signal', color: 'var(--ln-cyan)', title: 'Clear the feed on 3 days',
      brief: 'Classify something from your fleet on three different days this week.',
      why: 'A craft sends new data every day. An agency that keeps up with it finds things first.' },
    { id: 'review', kind: 'review', days: 1, icon: 'signal', color: 'var(--ln-board-gold)', title: 'Review a finding',
      brief: 'Open Community research, check another player\u2019s finding with your own look, then Support, Dispute or Unsure.',
      why: 'A finding is only verified when other agencies agree. Consensus is the community\u2019s goal.' },
    { id: 'breakthrough', kind: 'classification', days: 0, icon: 'star', color: 'var(--ln-board-gold)', title: 'Breakthrough',
      brief: 'Stamp research on five different days this week to finish the path.',
      why: 'A full week of steady research is what turns scattered reports into a result.' },
  ]
  if (opts.eventName) steps.unshift({
    id: 'event', kind: 'event', days: 1, icon: 'sky', color: 'var(--ln-cyan)', title: opts.eventStep?.title ?? `Catch debris in the ${opts.eventName}`,
    brief: opts.eventStep?.brief ?? 'Send your agency into the shared event run and bring a stamp home for the whole community.',
    why: 'Event weeks are shared research. Every agency that joins fills the same bar.',
  })
  return withProbeStep(steps, opts.hasProbe)
}

/** The fragment marker a rewarded step is recorded under in `claimedSteps`. */
const REWARD_MARKER: Record<string, number> = { 'step-2': 2, 'step-4': 4, breakthrough: 5 }

export function weeklyRewardKey(step: PathStep): keyof typeof WEEKLY_RESEARCH_REWARDS | null {
  if (step.id === 'breakthrough') return 'breakthrough'
  if (step.id === 'scan' || step.id === 'contract' || step.id === 'launch') return 'step-2'
  if (step.id === 'sales' || step.id === 'scan-again' || step.id === 'world' || step.id === 'fleet-watch') return 'step-4'
  return null
}

export function claimResearchReward<T extends { researchPath?: ResearchPathChoice; researchFragments?: number; researchRocketParts?: string[]; badges?: Record<string, { eventId: string; tier: 'gold' | 'silver'; earnedAt: number }> }>(player: T, step: PathStep, progress: { have: number; need: number }, now: number): T {
  const choice = player.researchPath
  const rewardKey = weeklyRewardKey(step)
  if (!choice || !rewardKey || progress.have < progress.need) return player
  const claimed = choice.claimedSteps ?? []
  const marker = REWARD_MARKER[rewardKey]
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
