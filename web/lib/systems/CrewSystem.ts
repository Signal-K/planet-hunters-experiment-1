// Pure state-transition functions for the crew roster (STS-591).
//
// Every crew mutation lives here, not in a React component — the same rule
// EconomySystem and ProgressionSystem follow. GameScreenRouter mutating francs
// inline was a real bug (STS-589); don't reintroduce the pattern for crew.

import type { GameState, Player } from '@/lib/game-types'
import {
  CREW_GIVEN_NAMES,
  CREW_SURNAMES,
  DRONE_DESIGNATION_PREFIX,
  HIRED_CREW_LEVEL,
  ROVER_DESIGNATION_PREFIX,
  TRAINED_CREW_LEVEL,
  type CrewClass,
  type CrewCondition,
  type CrewMember,
} from '@/lib/data'
import { CREW_XP_CURVE, grantXP, levelForXP, xpProgress, type XPProgress } from './XPSystem'

/** Crew level is derived, never stored — see the note on `CrewMember.xp`. */
export function crewLevel(member: Pick<CrewMember, 'xp'>): number {
  return levelForXP(member.xp, CREW_XP_CURVE)
}

export function crewProgress(member: Pick<CrewMember, 'xp'>): XPProgress {
  return xpProgress(member.xp, CREW_XP_CURVE)
}

/** XP at which a crew member sits exactly at the given level on CREW_XP_CURVE. */
export function xpForCrewLevel(level: number): number {
  const index = Math.min(Math.max(1, Math.floor(level)), CREW_XP_CURVE.thresholds.length) - 1
  return CREW_XP_CURVE.thresholds[index]
}

export interface CreateCrewMemberInput {
  id: string
  crewClass: CrewClass
  /** Omit to draw from the fixed pool, avoiding names already on `taken`. */
  name?: string
  /** Defaults by acquisition route: trained crew start at 1, hires at 3. */
  level?: number
  selfTrained: boolean
  hireCost?: number
  now: number
  /** Existing roster, used only so a drawn name doesn't collide. */
  taken?: readonly CrewMember[]
}

/**
 * Deterministic pick from the fixed pool, seeded off the crew id so the same
 * crew member always resolves to the same name — a roster that reshuffles its
 * names on reload would read as a different crew entirely. On collision we walk
 * forward through the pool rather than re-rolling, so the search terminates.
 */
export function pickCrewName(id: string, crewClass: CrewClass, taken: readonly CrewMember[] = []): string {
  if (crewClass !== 'astronaut') {
    const prefix = crewClass === 'rover' ? ROVER_DESIGNATION_PREFIX : DRONE_DESIGNATION_PREFIX
    const sameClass = taken.filter(c => c.crewClass === crewClass).length
    return `${prefix} ${String(sameClass + 1).padStart(2, '0')}`
  }
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const takenNames = new Set(taken.map(c => c.name))
  const combinations = CREW_GIVEN_NAMES.length * CREW_SURNAMES.length
  for (let step = 0; step < combinations; step++) {
    const slot = (hash + step) % combinations
    const name = `${CREW_GIVEN_NAMES[slot % CREW_GIVEN_NAMES.length]} ${CREW_SURNAMES[Math.floor(slot / CREW_GIVEN_NAMES.length)]}`
    if (!takenNames.has(name)) return name
  }
  // Pool exhausted — 1,920 crew is far past any plausible roster, but a
  // silently duplicated name is worse than an ugly one.
  return `${CREW_GIVEN_NAMES[hash % CREW_GIVEN_NAMES.length]} ${CREW_SURNAMES[hash % CREW_SURNAMES.length]}-${id.slice(-4)}`
}

export function createCrewMember(input: CreateCrewMemberInput): CrewMember {
  // A starting *level* is expressed as the XP that level costs, so a hire who
  // "arrives at level 3" and a trainee who worked up to level 3 are the same
  // crew member — there is no second, privileged way to hold a level.
  const level = input.level ?? (input.selfTrained ? TRAINED_CREW_LEVEL : HIRED_CREW_LEVEL)
  return {
    id: input.id,
    name: input.name ?? pickCrewName(input.id, input.crewClass, input.taken ?? []),
    crewClass: input.crewClass,
    xp: xpForCrewLevel(level),
    specialisations: [],
    condition: 'fit',
    joinedAt: input.now,
    selfTrained: input.selfTrained,
    ...(input.hireCost !== undefined ? { hireCost: input.hireCost } : {}),
  }
}

export function applyAddCrewMember(s: GameState, member: CrewMember): GameState {
  const crew = s.player.crew ?? []
  if (crew.some(c => c.id === member.id)) return s
  return { ...s, player: { ...s.player, crew: [...crew, member] } }
}

/** Crew only ever leave by quitting over unpaid upkeep, and stay re-hirable. */
export function applyRemoveCrewMember(s: GameState, id: string): GameState {
  const crew = s.player.crew ?? []
  if (!crew.some(c => c.id === id)) return s
  return { ...s, player: { ...s.player, crew: crew.filter(c => c.id !== id) } }
}

export function applySetCrewCondition(
  s: GameState,
  id: string,
  condition: CrewCondition,
  recoveredAt?: number,
): GameState {
  const crew = s.player.crew ?? []
  if (!crew.some(c => c.id === id)) return s
  return {
    ...s,
    player: {
      ...s.player,
      crew: crew.map(c => {
        if (c.id !== id) return c
        const next: CrewMember = { ...c, condition }
        if (condition === 'fit' || recoveredAt === undefined) delete next.recoveredAt
        else next.recoveredAt = recoveredAt
        return next
      }),
    },
  }
}

/**
 * Grant XP to one crew member. Goes through the shared `grantXP` primitive, so
 * crew progression and player research obey the same rules — no per-track
 * arithmetic. Missions grant XP to the crew that flew them, which is why a
 * benched astronaut falls behind one that works.
 */
export function applyGrantCrewXP(s: GameState, id: string, amount: number): GameState {
  const crew = s.player.crew ?? []
  const target = crew.find(c => c.id === id)
  if (!target) return s
  const granted = grantXP(target, amount)
  if (granted === target) return s
  return { ...s, player: { ...s.player, crew: crew.map(c => (c.id === id ? granted : c)) } }
}

/**
 * Settle lapsed conditions. Nothing ticks in the background, so recovery is
 * resolved lazily — on load, and whenever the roster is read for a decision.
 */
export function settleCrewConditions(crew: readonly CrewMember[], now: number): CrewMember[] {
  let changed = false
  const next = crew.map(c => {
    if (c.condition === 'fit' || c.recoveredAt === undefined || c.recoveredAt > now) return c
    changed = true
    const settled: CrewMember = { ...c, condition: 'fit' }
    delete settled.recoveredAt
    return settled
  })
  return changed ? next : [...crew]
}

// --- Persistence / migration -------------------------------------------------

const ROVER_CREW_ID_PREFIX = 'crew-rover-'

/** Roster id for a rover that predates the roster. Stable, so re-running is a no-op. */
export function roverCrewId(roverId: string): string {
  return `${ROVER_CREW_ID_PREFIX}${roverId}`
}

function isCrewMember(value: unknown): value is CrewMember {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return typeof c.id === 'string' && c.id.length > 0
    && typeof c.name === 'string'
    && (c.crewClass === 'astronaut' || c.crewClass === 'rover' || c.crewClass === 'drone')
}

function normalizeCrewMember(c: CrewMember, now: number): CrewMember {
  const condition: CrewCondition = c.condition === 'fatigued' || c.condition === 'injured' ? c.condition : 'fit'
  const normalized: CrewMember = {
    id: c.id,
    name: c.name,
    crewClass: c.crewClass,
    xp: Number.isFinite(c.xp) ? Math.max(0, Math.floor(c.xp)) : 0,
    specialisations: Array.isArray(c.specialisations) ? c.specialisations : [],
    condition,
    joinedAt: Number.isFinite(c.joinedAt) ? c.joinedAt : now,
    selfTrained: c.selfTrained === true,
    ...(Number.isFinite(c.hireCost) ? { hireCost: c.hireCost } : {}),
    ...(condition !== 'fit' && Number.isFinite(c.recoveredAt) ? { recoveredAt: c.recoveredAt } : {}),
  }
  return normalized
}

/**
 * Bring a loaded save's roster up to date.
 *
 * Rovers are not a parallel system: `roverDeployments` predates the roster, so
 * an existing save's rover must surface as a roster entry — exactly once, even
 * though a rover can hold several deployments over its life. Keyed on a stable
 * derived id so a second load doesn't mint a duplicate.
 */
export function migrateCrewRoster(player: Partial<Player>, now: number): CrewMember[] {
  const existing = Array.isArray(player.crew) ? player.crew.filter(isCrewMember).map(c => normalizeCrewMember(c, now)) : []
  const byId = new Map(existing.map(c => [c.id, c]))

  for (const deployment of player.roverDeployments ?? []) {
    if (typeof deployment?.roverId !== 'string' || deployment.roverId.length === 0) continue
    const id = roverCrewId(deployment.roverId)
    if (byId.has(id)) continue
    byId.set(id, createCrewMember({
      id,
      crewClass: 'rover',
      // A rover the player already owns was never hired, so it carries no hire
      // cost and must not count against the hired-crew cap.
      selfTrained: true,
      level: TRAINED_CREW_LEVEL,
      now: Number.isFinite(deployment.timestamp) ? deployment.timestamp : now,
      taken: [...byId.values()],
    }))
  }

  return settleCrewConditions([...byId.values()], now)
}
