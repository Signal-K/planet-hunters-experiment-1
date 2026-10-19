import type { Catalog } from '@/lib/catalog'
import type { Mission } from '@/lib/data/types'
import type { Player } from '@/lib/game-types'
import {
  ACADEMY_INTRO_MISSION_ID,
  RESOURCE_FOCUS_MISSION_ID,
  SELF_DIRECTED_MINING_MISSION_ID,
} from '@/lib/data/missions'
import { academyAffinityUnlocked } from '@/lib/systems/AcademySystem'
import { ownProgramStructureDelivered } from '@/lib/systems/ConstructionSystem'
import {
  SATURN_IMAGER_MISSION_ID,
  TRANSIT_TELESCOPE_MISSION_ID,
} from '@/lib/runtimeCatalog'
import {
  ATLAS_ORIONIDS_CHECKIN,
  WORLD_SPACE_WEEK_PLAYER_LINKS,
  getSkyEvent,
  isOrionidsPeakNight,
  orionidsCountdown,
  orionidsLocalStartMs,
  type PlayerBadge,
} from '@/lib/data/sky-events'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import { SPACETOBER_PEAK_BADGE, SPACETOBER_WEEK_BADGE, type OrionidsFind } from '@/lib/orionids/finds'
import { WSW_EVENT_IDS, WSW_RANGE_LABEL, wswBanner, wswChipsForMission } from '@/lib/wsw'

export type ProgramStepState = 'done' | 'current' | 'available' | 'locked'
export type ProgramStepKind = 'instrument' | 'academy' | 'build' | 'mining' | 'focus'

export interface ProgramStep {
  id: string
  title: string
  detail: string
  brief?: string
  /** Shown on a locked step. Comes from the mission's unlockAt, or an existing gate. */
  lockLine: string | null
  state: ProgramStepState
  kind: ProgramStepKind
  /** How far the player is toward the gate on a locked step (for example guided missions flown). */
  progress: { have: number; need: number; label: string } | null
}

export type SkyBoardStatus = 'upcoming' | 'live' | 'ended'

export interface SkyBoardCard {
  id: string
  name: string
  status: SkyBoardStatus
  countdownLabel: string | null
  earnedTier: 'gold' | 'silver' | null
  blurb: string
  actionLabel: string
  rewardLabel: string
}

export interface SpacetoberStep {
  id: 'world-space-week' | 'orionids-peak'
  name: string
  when: string
  status: string
  tier: 'gold' | 'silver' | null
}

export interface SpacetoberStrip {
  title: 'Spacetober'
  detail: string
  steps: SpacetoberStep[]
  links: ReadonlyArray<{ label: string; href: string }>
  vouchers: Array<{ subjectId: string; name: string; tier: 'gold' | 'silver' }>
  mastery: number
}

export interface EventsBoard {
  orionids: SkyBoardCard
  wsw: SkyBoardCard[]
  spacetober: SpacetoberStrip
  /** Red dot: an event is live or still upcoming. */
  attention: boolean
  groups: Array<{ status: SkyBoardStatus; title: string; cards: SkyBoardCard[] }>
}

const INSTRUMENTS: Array<{ id: string; title: string; brief: string; detail: string; unlockAt: string }> = [
  {
    id: TRANSIT_TELESCOPE_MISSION_ID,
    title: 'Launch Space Telescope',
    brief: 'Build a dedicated launch vehicle and deploy the telescope into Earth orbit. Once commissioned, it provides a daily asteroid-candidate feed in the Control Station.',
    detail: 'Space telescope online · daily instrument feed unlocked',
    unlockAt: 'Reach Free Operations',
  },
  {
    id: SATURN_IMAGER_MISSION_ID,
    title: 'Launch Saturn satellite',
    brief: 'Prepare and launch the Saturn imager, then review Cassini storm-cloud frames from its daily downlink in the Control Station.',
    detail: 'Saturn satellite online · Cassini storm-cloud feed unlocked',
    unlockAt: 'Reach Free Operations',
  },
]

const WSW_CARD_ORDER = ['draconids-2026', 'saturn-night-2026', 'rocket-revolution-2026', 'new-moon-hunt-2026-10']

function missionById(catalog: Catalog, id: string): Mission | undefined {
  return catalog.missions.find(mission => mission.id === id)
}

function instrumentDone(player: Player, id: string): boolean {
  if (id === TRANSIT_TELESCOPE_MISSION_ID) return !!player.transitSatelliteLaunchedAt || !!player.deepSpaceTelescopeLaunchedAt || !!player.deepSpaceTelescopeBuilt
  if (id === SATURN_IMAGER_MISSION_ID) return !!player.saturnImagerLaunchedAt
  return false
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** Progress toward a Free Operations gate: the guided missions flown so far. */
function gateProgress(step: Omit<ProgramStep, 'progress'> & { progress?: ProgramStep['progress'] }, player: Player): ProgramStep['progress'] {
  if (step.state !== 'locked' || !step.lockLine || !/free operations/i.test(step.lockLine)) return null
  return {
    have: Math.min(player.missionsDone, FREE_OPS_START_MISSIONS_DONE),
    need: FREE_OPS_START_MISSIONS_DONE,
    label: 'Guided missions flown',
  }
}

/**
 * Own-program chain for the Program tab. Instruments, the academy story and
 * builds stay in progression order. The first step that can be started is
 * current; later open steps stay available. Repeatable mining is never current.
 */
export function programChain(catalog: Catalog, player: Player, now = Date.now()): ProgramStep[] {
  const free = !!player.freeOperations
  const steps: Array<Omit<ProgramStep, 'progress'> & { progress?: ProgramStep['progress'] }> = INSTRUMENTS.map(spec => {
    const mission = missionById(catalog, spec.id)
    const done = instrumentDone(player, spec.id)
    const locked = !done && !free
    return {
      id: spec.id,
      title: mission?.title ?? spec.title,
      detail: mission?.programReward?.outcome ?? spec.detail,
      brief: mission?.brief ?? spec.brief,
      lockLine: locked ? (mission?.unlockAt ?? spec.unlockAt) : null,
      state: done ? 'done' : locked ? 'locked' : 'available',
      kind: 'instrument',
    }
  })

  const academy = missionById(catalog, ACADEMY_INTRO_MISSION_ID)
  const academyDone = (player.placed ?? []).includes('astronaut-academy')
  const academyLocked = !academyDone && !academyAffinityUnlocked(player)
  steps.push({
    id: ACADEMY_INTRO_MISSION_ID,
    title: academy?.title ?? 'Train the First Astronaut',
    detail: academy?.programReward?.outcome ?? 'Astronaut Academy online · crew training unlocked',
    brief: academy?.brief,
    lockLine: academyLocked ? (academy?.unlockAt ?? 'Reach client level 2 with two clients') : null,
    state: academyDone ? 'done' : academyLocked ? 'locked' : 'available',
    kind: 'academy',
  })

  const builds = catalog.missions.filter(mission => mission.construction && !mission.client)
  for (const mission of builds) {
    const delivered = ownProgramStructureDelivered(player, mission.construction!.structureKind)
    const lockLine = !delivered && !free ? (mission.unlockAt ?? null) : null
    steps.push({
      id: mission.id,
      title: mission.title,
      detail: mission.programReward?.outcome ?? mission.brief,
      brief: mission.brief,
      lockLine,
      state: delivered ? 'done' : lockLine ? 'locked' : 'available',
      kind: 'build',
    })
  }

  const mining = missionById(catalog, SELF_DIRECTED_MINING_MISSION_ID)
  steps.push({
    id: SELF_DIRECTED_MINING_MISSION_ID,
    title: mining?.title ?? 'Self-Directed Mining Run',
    detail: mining?.brief ?? 'No client, no daily limit. Mine what looks valuable and sell the haul yourself.',
    brief: mining?.brief,
    lockLine: free ? null : (mining?.unlockAt ?? 'Reach Free Operations'),
    state: free ? 'available' : 'locked',
    kind: 'mining',
  })

  const focus = missionById(catalog, RESOURCE_FOCUS_MISSION_ID)
  if (focus) {
    steps.push({
      id: focus.id,
      title: focus.title,
    detail: focus.brief,
    brief: focus.brief,
      lockLine: null,
      state: 'available',
      kind: 'focus',
    })
  }

  let marked = false
  return steps.map(raw => {
    const step = { ...raw, progress: raw.progress ?? gateProgress(raw, player) }
    if (step.state !== 'available' || step.kind === 'mining' || step.kind === 'focus') return step
    if (marked) return step
    marked = true
    return { ...step, state: 'current' as const }
  })
}

function skyStatus(start: number, end: number, now: number): SkyBoardStatus {
  if (now < start) return 'upcoming'
  if (now < end) return 'live'
  return 'ended'
}

function countdownLabel(now: number): string {
  const { days, hours } = orionidsCountdown(now)
  return `${plural(days, 'day')} ${plural(hours, 'hour')} to start`
}

function eventActionLabel(status: SkyBoardStatus): string {
  if (status === 'ended') return 'PLAY FOR SILVER'
  if (status === 'live') return 'PARTICIPATE'
  return 'PREPARE'
}

function eventRewardLabel(status: SkyBoardStatus, earnedTier: SkyBoardCard['earnedTier']): string {
  if (earnedTier) return `${earnedTier.toUpperCase()} BADGE EARNED`
  return status === 'ended' ? 'REPLAY REWARD · SILVER BADGE' : 'EVENT REWARD · GOLD BADGE'
}

function peakStepStatus(now: number): string {
  const start = new Date(2026, 9, 21, 18, 0, 0, 0).getTime()
  const end = new Date(2026, 9, 22, 6, 0, 0, 0).getTime()
  if (now < start) return 'upcoming'
  if (now < end || isOrionidsPeakNight(now)) return 'peak night'
  return 'passed'
}

export function spacetoberStrip(
  now: number,
  badges: Record<string, PlayerBadge> | undefined,
  finds: Record<string, OrionidsFind> | undefined,
  mastery = 0,
): SpacetoberStrip {
  const week = badges?.[SPACETOBER_WEEK_BADGE]
  const peak = badges?.[SPACETOBER_PEAK_BADGE]
  const weekTier = week?.tier === 'gold' || week?.tier === 'silver' ? week.tier : null
  const peakTier = peak?.tier === 'gold' || peak?.tier === 'silver' ? peak.tier : null
  return {
    title: 'Spacetober',
    detail: 'World Space Week, then the Orionids peak.',
    steps: [
      {
        id: 'world-space-week',
        name: 'World Space Week',
        when: WSW_RANGE_LABEL,
        status: wswBanner(badges, now).live ? 'live' : 'ended',
        tier: weekTier,
      },
      {
        id: 'orionids-peak',
        name: 'Orionids peak',
        when: '21 Oct 18:00 – 22 Oct 06:00',
        status: peakStepStatus(now),
        tier: peakTier,
      },
    ],
    links: [...WORLD_SPACE_WEEK_PLAYER_LINKS, ATLAS_ORIONIDS_CHECKIN],
    vouchers: Object.values(finds ?? {}).map(find => ({ subjectId: find.subjectId, name: find.name, tier: find.tier })),
    mastery,
  }
}

/** Orionids hero plus the World Space Week cards. Orionids is not a WSW event. */
export function eventsBoard(
  now: number,
  badges: Record<string, PlayerBadge> | undefined,
  orionidsNow = now,
  finds?: Record<string, OrionidsFind>,
  mastery = 0,
): EventsBoard {
  const orionids = getSkyEvent('orionids-2026')
  const start = orionidsLocalStartMs()
  const end = orionids ? Date.parse(orionids.endUtc) : start
  const status = skyStatus(start, end, orionidsNow)
  const earned = badges?.['orionids-2026']?.tier ?? null
  const orionidsCard: SkyBoardCard = {
    id: 'orionids-2026',
    name: orionids?.name ?? 'Orionids',
    status,
    countdownLabel: status === 'upcoming' ? countdownLabel(orionidsNow) : null,
    earnedTier: earned === 'gold' || earned === 'silver' ? earned : null,
    blurb: 'Mine debris at night, earn badges',
    actionLabel: eventActionLabel(status),
    rewardLabel: eventRewardLabel(status, earned),
  }
  const order = [
    ...WSW_CARD_ORDER.filter(id => (WSW_EVENT_IDS as readonly string[]).includes(id)),
    ...WSW_EVENT_IDS.filter(id => !WSW_CARD_ORDER.includes(id)),
  ]
  const wsw = order.map(id => {
    const event = getSkyEvent(id)
    const eventStart = event ? Date.parse(event.startUtc) : now
    const eventEnd = event ? Date.parse(event.endUtc) : now
    const eventStatus = skyStatus(eventStart, eventEnd, now)
    const tier = badges?.[id]?.tier
    const earnedTier = tier === 'gold' || tier === 'silver' ? tier : null
    return {
      id,
      name: event?.name ?? id,
      status: eventStatus,
      countdownLabel: eventStatus === 'upcoming' ? null : null,
      earnedTier,
      blurb: '',
      actionLabel: eventActionLabel(eventStatus),
      rewardLabel: eventRewardLabel(eventStatus, earnedTier),
    }
  })
  const attention = orionidsCard.status !== 'ended' || wsw.some(card => card.status === 'live' || card.status === 'upcoming')
  const all = [orionidsCard, ...wsw]
  const groups: EventsBoard['groups'] = ([['live', 'Live now'], ['upcoming', 'Upcoming'], ['ended', 'Past events']] as const)
    .map(([groupStatus, title]) => ({ status: groupStatus, title, cards: all.filter(card => card.status === groupStatus) }))
    .filter(group => group.cards.length > 0)
  return { orionids: orionidsCard, wsw, spacetober: spacetoberStrip(orionidsNow, badges, finds, mastery), attention, groups }
}

/** Compact WSW mark for a contract card. Hidden when the mission earns no WSW chip. */
export function contractWswMark(
  mission: Pick<Mission, 'payload' | 'construction'>,
  badges: Record<string, PlayerBadge> | undefined,
  now: number,
): { label: string; title: string } | null {
  const chips = wswChipsForMission(mission, badges, now)
  if (chips.length === 0) return null
  const banner = wswBanner(badges, now)
  return {
    label: `WSW ${banner.earned}/${banner.total}`,
    title: chips.map(chip => chip.label).join(' · '),
  }
}
