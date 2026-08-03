import type { GameState, Player } from '@/lib/game-types'
import {
  ACADEMY_DAILY_UPKEEP,
  ACADEMY_RESEARCH_XP_COST,
  CLIENT_AFFINITY_MISSION_THRESHOLD,
  CREW_DAILY_UPKEEP,
  CREW_FIRST_HIRE_COST,
  CREW_HIRE_ESCALATION,
  CREW_MISSION_XP,
  CREW_MODULE_RESEARCH_XP_COST,
  CREW_QUIT_REFUND_RATE,
  CREW_TOTAL_HIRED_CAP,
  CREW_TRAINING_DURATION_MS,
  CREW_TRAINING_XP,
  CREW_WEEKLY_HIRE_CAP,
  TRAINING_SESSIONS_PER_DAY,
  crewSourcesForClients,
  getActorArchetype,
  archetypeSupportsSpecialisation,
  type Client,
  type CrewMember,
  type CrewRequirement,
  type CrewSource,
  type CrewTrainingSession,
  type Mission,
  type SkillBranch,
} from '@/lib/data'
import { ACADEMY_XP_CURVE, levelForXP } from './XPSystem'
import { createCrewMember, crewLevel, pickCrewName } from './CrewSystem'

const DAY_MS = 24 * 60 * 60 * 1000
export const FATIGUE_RECOVERY_MS = 12 * 60 * 60 * 1000
export const INJURY_RECOVERY_MS = 3 * DAY_MS

export function utcDateKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

export function utcWeekKey(now: number = Date.now()): string {
  const date = new Date(now)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

export function clientAffinityLevel(completedJobs: number): number {
  return 1 + Math.floor(Math.max(0, completedJobs) / CLIENT_AFFINITY_MISSION_THRESHOLD)
}

export function academyAffinityUnlocked(player: Pick<Player, 'clientMissions'>): boolean {
  return Object.values(player.clientMissions).filter(jobs => clientAffinityLevel(jobs) >= 2).length >= 2
}

export function academyLevel(player: Pick<Player, 'academyXP'>): number {
  return levelForXP(player.academyXP ?? 0, ACADEMY_XP_CURVE)
}

export function academyTrainingCapacity(player: Pick<Player, 'academyXP'>): number {
  return academyLevel(player)
}

export function hireCost(player: Pick<Player, 'crewHiresLifetime'>): number {
  return Math.round(CREW_FIRST_HIRE_COST * Math.pow(CREW_HIRE_ESCALATION, player.crewHiresLifetime ?? 0))
}

export function availableCrewSources(player: Player, clients: Record<string, Client>): CrewSource[] {
  return crewSourcesForClients(clients).filter(source => {
    if (source.kind === 'agency') return true
    return !!source.clientId && clientAffinityLevel(player.clientMissions[source.clientId] ?? 0) >= 2
  })
}

export interface HireEligibility {
  ok: boolean
  reason?: 'academy-locked' | 'unknown-source' | 'source-locked' | 'weekly-cap' | 'hired-cap' | 'insufficient-francs'
  cost: number
}

export function crewHireEligibility(
  player: Player,
  sourceId: string,
  clients: Record<string, Client>,
  academyBuilt: boolean,
  now: number = Date.now(),
): HireEligibility {
  const cost = hireCost(player)
  if (!player.academyResearched || !academyBuilt) {
    return { ok: false, reason: 'academy-locked', cost }
  }
  const source = crewSourcesForClients(clients).find(item => item.id === sourceId)
  if (!source) return { ok: false, reason: 'unknown-source', cost }
  if (!availableCrewSources(player, clients).some(item => item.id === sourceId)) {
    return { ok: false, reason: 'source-locked', cost }
  }
  const weekHires = player.crewHireWeek === utcWeekKey(now) ? (player.crewHiresThisWeek ?? 0) : 0
  if (weekHires >= CREW_WEEKLY_HIRE_CAP) return { ok: false, reason: 'weekly-cap', cost }
  const hiredCount = (player.crew ?? []).filter(member => !member.selfTrained).length
  if (hiredCount >= CREW_TOTAL_HIRED_CAP) return { ok: false, reason: 'hired-cap', cost }
  if (player.francs < cost) return { ok: false, reason: 'insufficient-francs', cost }
  return { ok: true, cost }
}

export function applyHireCrew(
  state: GameState,
  sourceId: string,
  clients: Record<string, Client>,
  now: number = Date.now(),
): GameState {
  const eligibility = crewHireEligibility(
    state.player,
    sourceId,
    clients,
    state.player.placed.includes('astronaut-academy'),
    now,
  )
  if (!eligibility.ok) return state
  const crew = state.player.crew ?? []
  const member = createCrewMember({
    id: `crew-hire-${now}-${state.player.crewHiresLifetime ?? 0}`,
    crewClass: 'astronaut',
    selfTrained: false,
    hireCost: eligibility.cost,
    now,
    taken: crew,
  })
  member.sourceId = sourceId
  const week = utcWeekKey(now)
  const weekHires = state.player.crewHireWeek === week ? (state.player.crewHiresThisWeek ?? 0) : 0
  return {
    ...state,
    player: {
      ...state.player,
      francs: state.player.francs - eligibility.cost,
      crew: [...crew, member],
      crewHiresLifetime: (state.player.crewHiresLifetime ?? 0) + 1,
      crewHiresThisWeek: weekHires + 1,
      crewHireWeek: week,
    },
  }
}

export function applyRehireCrew(state: GameState, crewId: string, now: number = Date.now()): GameState {
  const offers = state.player.formerCrew ?? []
  const offer = offers.find(item => item.member.id === crewId)
  if (!offer || state.player.francs < offer.rehireCost) return state
  const week = utcWeekKey(now)
  const weekHires = state.player.crewHireWeek === week ? (state.player.crewHiresThisWeek ?? 0) : 0
  const hiredCount = (state.player.crew ?? []).filter(member => !member.selfTrained).length
  if (weekHires >= CREW_WEEKLY_HIRE_CAP || hiredCount >= CREW_TOTAL_HIRED_CAP) return state
  return {
    ...state,
    player: {
      ...state.player,
      francs: state.player.francs - offer.rehireCost,
      crew: [...(state.player.crew ?? []), { ...offer.member, joinedAt: now, condition: 'fit', hireCost: offer.rehireCost }],
      formerCrew: offers.filter(item => item.member.id !== crewId),
      crewHiresThisWeek: weekHires + 1,
      crewHireWeek: week,
    },
  }
}

function utcDayNumber(key: string): number {
  const parsed = Date.parse(`${key}T00:00:00.000Z`)
  return Number.isFinite(parsed) ? Math.floor(parsed / DAY_MS) : 0
}

/**
 * Daily upkeep settles lazily. If the balance cannot cover the absence, paid
 * hires mortgage out one at a time and remain available as re-hire offers.
 * No debt is created and starting/self-trained crew are never deleted.
 */
export function settleCrewEconomy(state: GameState, now: number = Date.now()): GameState {
  const today = utcDateKey(now)
  const last = state.player.crewUpkeepSettledDate
  if (!last) return { ...state, player: { ...state.player, crewUpkeepSettledDate: today } }
  const elapsedDays = Math.max(0, utcDayNumber(today) - utcDayNumber(last))
  if (elapsedDays === 0) return state

  let crew = [...(state.player.crew ?? [])]
  const former = [...(state.player.formerCrew ?? [])]
  let francs = state.player.francs
  let funded = !!state.player.academyFunded
  const academyBuilt = state.player.placed.includes('astronaut-academy')
  const dailyCost = () =>
    crew.filter(member => getActorArchetype(member.crewClass)?.hasUpkeep).length * CREW_DAILY_UPKEEP
    + (academyBuilt && funded ? ACADEMY_DAILY_UPKEEP : 0)
  let due = dailyCost() * elapsedDays

  const hired = crew
    .filter(member => !member.selfTrained && (member.hireCost ?? 0) > 0)
    .sort((a, b) => (b.hireCost ?? 0) - (a.hireCost ?? 0))
  while (due > francs && hired.length > 0) {
    const member = hired.shift()!
    const refund = Math.round((member.hireCost ?? 0) * CREW_QUIT_REFUND_RATE)
    crew = crew.filter(item => item.id !== member.id)
    former.push({ member, rehireCost: refund, leftAt: now })
    francs += refund
    due = dailyCost() * elapsedDays
  }
  if (due > francs && funded) {
    funded = false
    due = dailyCost() * elapsedDays
  }
  francs = Math.max(0, francs - Math.min(francs, due))

  return {
    ...state,
    player: {
      ...state.player,
      francs,
      crew,
      formerCrew: former,
      academyFunded: funded,
      crewUpkeepSettledDate: today,
      // Remove assignments for anyone who left.
      structureCrewAssignments: Object.fromEntries(
        Object.entries(state.player.structureCrewAssignments ?? {}).filter(([, crewId]) => crew.some(member => member.id === crewId)),
      ),
    },
  }
}

export function applyResearchAcademy(state: GameState): GameState {
  if (state.player.academyResearched || !academyAffinityUnlocked(state.player)) return state
  if ((state.player.researchXP ?? 0) < ACADEMY_RESEARCH_XP_COST) return state
  return {
    ...state,
    player: {
      ...state.player,
      researchXP: (state.player.researchXP ?? 0) - ACADEMY_RESEARCH_XP_COST,
      academyResearched: true,
      academyFunded: true,
    },
  }
}

export function applySetAcademyFunding(state: GameState, funded: boolean): GameState {
  if (!state.player.placed.includes('astronaut-academy')) return state
  return { ...state, player: { ...state.player, academyFunded: funded } }
}

export function applyResearchCrewModule(state: GameState): GameState {
  if (state.player.crewModuleResearched || !state.player.academyResearched) return state
  if ((state.player.researchXP ?? 0) < CREW_MODULE_RESEARCH_XP_COST) return state
  return {
    ...state,
    player: {
      ...state.player,
      researchXP: (state.player.researchXP ?? 0) - CREW_MODULE_RESEARCH_XP_COST,
      crewModuleResearched: true,
    },
  }
}

function dailyTrainingUsage(player: Player, now: number): number {
  return player.trainingDate === utcDateKey(now) ? (player.trainingSessionsUsedToday ?? 0) : 0
}

function canStartTraining(state: GameState, now: number): boolean {
  if (!state.player.academyFunded || !state.player.placed.includes('astronaut-academy')) return false
  if (dailyTrainingUsage(state.player, now) >= TRAINING_SESSIONS_PER_DAY) return false
  return (state.player.crewTraining ?? []).length < academyTrainingCapacity(state.player)
}

function withTrainingSession(state: GameState, session: CrewTrainingSession, now: number): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      crewTraining: [...(state.player.crewTraining ?? []), session],
      trainingSessionsUsedToday: dailyTrainingUsage(state.player, now) + 1,
      trainingDate: utcDateKey(now),
    },
  }
}

export function applyStartCrewTraining(
  state: GameState,
  crewId: string,
  branch: SkillBranch,
  now: number = Date.now(),
): GameState {
  if (!canStartTraining(state, now)) return state
  const member = state.player.crew?.find(item => item.id === crewId)
  if (!member || member.condition !== 'fit' || !archetypeSupportsSpecialisation(member.crewClass, branch)) return state
  if ((state.player.crewTraining ?? []).some(session => session.crewId === crewId)) return state
  const tier = member.specialisations.find(item => item.branch === branch)?.tier ?? 0
  if (tier >= 3) return state
  return withTrainingSession(state, {
    id: `training-${crewId}-${branch}-${now}`,
    crewId,
    branch,
    startedAt: now,
    completesAt: now + CREW_TRAINING_DURATION_MS,
  }, now)
}

export function applyStartCandidateTraining(
  state: GameState,
  branch: SkillBranch,
  now: number = Date.now(),
): GameState {
  if (!canStartTraining(state, now)) return state
  const crew = state.player.crew ?? []
  const candidateId = `crew-trained-${now}`
  return withTrainingSession(state, {
    id: `training-${candidateId}-${branch}`,
    candidateId,
    candidateName: pickCrewName(candidateId, 'astronaut', crew),
    branch,
    startedAt: now,
    completesAt: now + CREW_TRAINING_DURATION_MS,
  }, now)
}

function addSpecialisation(member: CrewMember, branch: SkillBranch): CrewMember {
  const current = member.specialisations.find(item => item.branch === branch)?.tier ?? 0
  return {
    ...member,
    specialisations: [
      ...member.specialisations.filter(item => item.branch !== branch),
      { branch, tier: Math.min(3, current + 1) },
    ],
    xp: member.xp + CREW_TRAINING_XP,
  }
}

export function applyCollectCrewTraining(
  state: GameState,
  sessionId: string,
  now: number = Date.now(),
): GameState {
  const sessions = state.player.crewTraining ?? []
  const session = sessions.find(item => item.id === sessionId)
  if (!session || now < session.completesAt) return state
  let crew = [...(state.player.crew ?? [])]
  if (session.crewId) {
    crew = crew.map(member => member.id === session.crewId ? addSpecialisation(member, session.branch) : member)
  } else if (session.candidateId) {
    const member = createCrewMember({
      id: session.candidateId,
      name: session.candidateName,
      crewClass: 'astronaut',
      selfTrained: true,
      now,
      taken: crew,
    })
    crew.push(addSpecialisation(member, session.branch))
  }
  return {
    ...state,
    player: {
      ...state.player,
      crew,
      crewTraining: sessions.filter(item => item.id !== sessionId),
      academyXP: (state.player.academyXP ?? 0) + 250,
    },
  }
}

export interface CrewRequirementStatus {
  met: boolean
  member?: CrewMember
  members?: CrewMember[]
  bestLevel: number
  bestTier: number
  reason: string
}

export function crewRequirementStatus(
  requirement: CrewRequirement | undefined,
  crew: readonly CrewMember[],
): CrewRequirementStatus {
  if (!requirement) return { met: true, bestLevel: 0, bestTier: 0, reason: 'No crew requirement' }
  const available = crew.filter(member => member.condition === 'fit')
  const ranked = available
    .map(member => ({
      member,
      level: crewLevel(member),
      tier: member.specialisations.find(item => item.branch === requirement.branch)?.tier ?? 0,
    }))
    .sort((a, b) => (b.tier - a.tier) || (b.level - a.level))
  const requiredCount = Math.max(1, requirement.count ?? 1)
  const matches = ranked.filter(item => item.tier >= requirement.minTier && item.level >= requirement.minLevel)
  if (matches.length >= requiredCount) {
    return {
      met: true,
      member: matches[0].member,
      members: matches.slice(0, requiredCount).map(item => item.member),
      bestLevel: matches[0].level,
      bestTier: matches[0].tier,
      reason: requiredCount === 1
        ? `${matches[0].member.name} meets ${requirement.branch} T${requirement.minTier} · L${requirement.minLevel}`
        : `${matches.length}/${requiredCount} crew meet ${requirement.branch} T${requirement.minTier} · L${requirement.minLevel}`,
    }
  }
  const best = ranked[0]
  return {
    met: false,
    member: best?.member,
    bestLevel: best?.level ?? 0,
    bestTier: best?.tier ?? 0,
    reason: `Needs ${requiredCount} × ${requirement.branch} T${requirement.minTier} · L${requirement.minLevel}; ${matches.length} qualified, best available is T${best?.tier ?? 0} · L${best?.level ?? 0}`,
  }
}

export function missionCrewForLaunch(state: GameState, mission: Mission): string[] {
  const crew = state.player.crew ?? []
  if (!state.player.crewModuleResearched || state.player.shipCustomizerParts?.['crew-module'] !== 'crew-quarters-t1') return []
  const required = crewRequirementStatus(mission.requires.crew, crew)
  if (mission.requires.crew) return required.met ? (required.members ?? []).slice(0, 2).map(member => member.id) : []
  const astronaut = crew.find(member => member.crewClass === 'astronaut' && member.condition === 'fit')
  return astronaut ? [astronaut.id] : []
}

export function applyAwardMissionCrewXP(
  state: GameState,
  awardId: string,
  now: number = Date.now(),
  injuredOnReturn = false,
): GameState {
  if ((state.player.crewMissionAwards ?? []).includes(awardId)) return state
  const assigned = new Set(state.player.missionCrewIds ?? [])
  if (assigned.size === 0) return state
  const crew = (state.player.crew ?? []).map(member => {
    if (!assigned.has(member.id)) return member
    const injured = state.player.shipDestroyed && injuredOnReturn
    return {
      ...member,
      xp: member.xp + CREW_MISSION_XP,
      condition: injured ? 'injured' as const : 'fatigued' as const,
      recoveredAt: now + (injured ? INJURY_RECOVERY_MS : FATIGUE_RECOVERY_MS),
    }
  })
  return {
    ...state,
    player: {
      ...state.player,
      crew,
      crewMissionAwards: [...(state.player.crewMissionAwards ?? []), awardId],
    },
  }
}

export function applyAssignCrewToStructure(state: GameState, structureId: string, crewId: string | null): GameState {
  const current = { ...(state.player.structureCrewAssignments ?? {}) }
  for (const [key, value] of Object.entries(current)) {
    if (value === crewId || key === structureId) delete current[key]
  }
  if (crewId && state.player.crew?.some(member => member.id === crewId && member.condition === 'fit')) {
    current[structureId] = crewId
  }
  return { ...state, player: { ...state.player, structureCrewAssignments: current } }
}

export function structureIsStaffed(player: Pick<Player, 'structureCrewAssignments'>, structureId: string): boolean {
  return !!player.structureCrewAssignments?.[structureId]
}

export function diplomacyActive(player: Player): boolean {
  return structureIsStaffed(player, 'diplomacy')
}

export function applyShareChartsWithClient(state: GameState, clientId: string): GameState {
  if (!diplomacyActive(state.player) || clientAffinityLevel(state.player.clientMissions[clientId] ?? 0) < 2) return state
  const chartsAvailable = Object.values(state.player.targetScanCounts ?? {}).reduce((sum, count) => sum + count, 0)
  const shared = state.player.sharedChartsByClient?.[clientId] ?? 0
  if (chartsAvailable <= shared) return state
  return {
    ...state,
    player: {
      ...state.player,
      sharedChartsByClient: { ...(state.player.sharedChartsByClient ?? {}), [clientId]: shared + 1 },
    },
  }
}

export function diplomacyPayoutMultiplier(player: Player, clientId: string): number {
  if (!diplomacyActive(player)) return 1
  const affinity = clientAffinityLevel(player.clientMissions[clientId] ?? 0)
  const charts = player.sharedChartsByClient?.[clientId] ?? 0
  return 1 + Math.min(0.25, Math.max(0, affinity - 1) * 0.05 + charts * 0.02)
}

export function jointMissionUnlocked(player: Player, clientId: string): boolean {
  return diplomacyActive(player)
    && clientAffinityLevel(player.clientMissions[clientId] ?? 0) >= 2
    && (player.sharedChartsByClient?.[clientId] ?? 0) > 0
}
