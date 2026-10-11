import type { Catalog } from '@/lib/catalog'
import type { Mission } from '@/lib/data/types'
import type { Player } from '@/lib/game-types'
import {
  ACADEMY_INTRO_MISSION_ID,
  REFINERY_BUILD_MISSION_ID,
  RESOURCE_FOCUS_MISSION_ID,
  SELF_DIRECTED_MINING_MISSION_ID,
} from '@/lib/data/missions'
import { academyAffinityUnlocked } from '@/lib/systems/AcademySystem'
import { hasActiveBuildSiteRight, ownProgramStructureDelivered } from '@/lib/systems/ConstructionSystem'
import {
  DEEP_SPACE_TELESCOPE_MISSION_ID,
  SATURN_IMAGER_MISSION_ID,
  TRANSIT_TELESCOPE_MISSION_ID,
} from '@/lib/runtimeCatalog'
import {
  getSkyEvent,
  orionidsCountdown,
  orionidsLocalStartMs,
  type PlayerBadge,
} from '@/lib/data/sky-events'
import { WSW_EVENT_IDS, wswBanner, wswChipsForMission } from '@/lib/wsw'

export type ProgramStepState = 'done' | 'current' | 'available' | 'locked'
export type ProgramStepKind = 'instrument' | 'academy' | 'build' | 'mining' | 'focus'

export interface ProgramStep {
  id: string
  title: string
  detail: string
  /** Shown on a locked step. Comes from the mission's unlockAt, or an existing gate. */
  lockLine: string | null
  state: ProgramStepState
  kind: ProgramStepKind
}

export type SkyBoardStatus = 'upcoming' | 'live' | 'ended'

export interface SkyBoardCard {
  id: string
  name: string
  status: SkyBoardStatus
  countdownLabel: string | null
  earnedTier: 'gold' | 'silver' | null
  blurb: string
}

export interface EventsBoard {
  orionids: SkyBoardCard
  wsw: SkyBoardCard[]
  /** Red dot: an event is live or still upcoming. */
  attention: boolean
}

const INSTRUMENTS: Array<{ id: string; title: string; detail: string; unlockAt: string }> = [
  {
    id: TRANSIT_TELESCOPE_MISSION_ID,
    title: 'Launch Transit Telescope',
    detail: 'Transit telescope online · daily instrument feed unlocked',
    unlockAt: 'Reach Free Operations',
  },
  {
    id: DEEP_SPACE_TELESCOPE_MISSION_ID,
    title: 'Launch Deep Space Telescope',
    detail: 'Deep Space Telescope online · asteroid discovery unlocked',
    unlockAt: 'Reach Free Operations',
  },
  {
    id: SATURN_IMAGER_MISSION_ID,
    title: 'Launch Saturn satellite',
    detail: 'Saturn satellite online · Cassini storm-cloud feed unlocked',
    unlockAt: 'Reach Free Operations',
  },
]

const WSW_CARD_ORDER = ['draconids-2026', 'saturn-night-2026', 'rocket-revolution-2026', 'new-moon-hunt-2026-10']

function missionById(catalog: Catalog, id: string): Mission | undefined {
  return catalog.missions.find(mission => mission.id === id)
}

function instrumentDone(player: Player, id: string): boolean {
  if (id === TRANSIT_TELESCOPE_MISSION_ID) return !!player.transitSatelliteLaunchedAt
  if (id === DEEP_SPACE_TELESCOPE_MISSION_ID) {
    return !!player.deepSpaceTelescopeLaunchedAt || !!player.deepSpaceTelescopeBuilt || (player.placed ?? []).includes('deep-space-telescope')
  }
  if (id === SATURN_IMAGER_MISSION_ID) return !!player.saturnImagerLaunchedAt
  return false
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/**
 * Own-program chain for the Program tab. Instruments, the academy story and
 * builds stay in progression order. The first step that can be started is
 * current; later open steps stay available. Repeatable mining is never current.
 */
export function programChain(catalog: Catalog, player: Player, now = Date.now()): ProgramStep[] {
  const free = !!player.freeOperations
  const steps: ProgramStep[] = INSTRUMENTS.map(spec => {
    const mission = missionById(catalog, spec.id)
    const done = instrumentDone(player, spec.id)
    const locked = !done && !free
    return {
      id: spec.id,
      title: mission?.title ?? spec.title,
      detail: mission?.programReward?.outcome ?? spec.detail,
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
    lockLine: academyLocked ? (academy?.unlockAt ?? 'Reach client level 2 with two clients') : null,
    state: academyDone ? 'done' : academyLocked ? 'locked' : 'available',
    kind: 'academy',
  })

  const builds = catalog.missions.filter(mission => mission.construction && !mission.client)
  for (const mission of builds) {
    const delivered = ownProgramStructureDelivered(player, mission.construction!.structureKind)
    let lockLine: string | null = null
    if (!delivered && !free) lockLine = mission.unlockAt ?? null
    else if (!delivered && mission.id === REFINERY_BUILD_MISSION_ID) {
      const structures = ownProgramStructureDelivered(player, 'mining-settlement') && ownProgramStructureDelivered(player, 'mineral-silo')
      if (!structures) lockLine = 'Deliver a mining settlement and a remote silo first'
      else if (!hasActiveBuildSiteRight(player, now)) lockLine = mission.unlockAt ?? null
    }
    steps.push({
      id: mission.id,
      title: mission.title,
      detail: mission.programReward?.outcome ?? mission.brief,
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
      lockLine: null,
      state: 'available',
      kind: 'focus',
    })
  }

  let marked = false
  return steps.map(step => {
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

/** Orionids hero plus the World Space Week cards. Orionids is not a WSW event. */
export function eventsBoard(
  now: number,
  badges: Record<string, PlayerBadge> | undefined,
  orionidsNow = now,
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
    return {
      id,
      name: event?.name ?? id,
      status: eventStatus,
      countdownLabel: eventStatus === 'upcoming' ? null : null,
      earnedTier: tier === 'gold' || tier === 'silver' ? tier : null,
      blurb: '',
    }
  })
  const attention = orionidsCard.status !== 'ended' || wsw.some(card => card.status === 'live' || card.status === 'upcoming')
  return { orionids: orionidsCard, wsw, attention }
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
