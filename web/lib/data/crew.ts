// Astronaut Academy — crew data model (STS-591).
//
// Crew are persisted *individuals* with a name, not a headcount. That single
// decision is what the rest of the epic hangs off: per-crew training state,
// per-crew XP, and a roster UI rather than a set of counters. See ZenNotes
// `projects/landnam/decisions/Astronaut academy — crew model.md`.
//
// Deliberately absent, and not to be added speculatively:
//   - Non-astronaut human roles (geologist, flight controller, drone operator).
//     Deferred a month or two by explicit decision.
//   - Any permanent-death / crew-lost state. A destroyed ship does not kill its
//     crew; quitting over unpaid upkeep is the only way anyone leaves, and they
//     stay re-hirable.
//   - Any citizen-science field. Standing rule in `Landnam/CLAUDE.md`.

import type { SkillBranch } from './skills'

/** The roster holds astronauts, rovers and drones — nothing else in v0. */
export type CrewClass = 'astronaut' | 'rover' | 'drone'

/** Condition, never casualties. Crew recover; they are never permanently lost. */
export type CrewCondition = 'fit' | 'fatigued' | 'injured'

/**
 * Crew specialise along the *existing* `SkillBranch` axes rather than a second
 * progression vocabulary (pilot/geologist/medic), so the player holds one set
 * of terms. Three tiers each. Provisional — scheduled for review in four
 * sprints against real feedback (STS-599).
 */
export interface CrewSpecialisation {
  branch: SkillBranch
  /** 1–3. See CREW_SPEC_MAX_TIER. */
  tier: number
}

export const CREW_SPEC_MAX_TIER = 3

export interface CrewMember {
  /** Stable across saves; roster identity everything else keys off. */
  id: string
  name: string
  crewClass: CrewClass
  /**
   * Accumulated across missions flown and training sessions completed. Level is
   * *derived* from this via `CREW_XP_CURVE` (see `crewLevel` in CrewSystem) and
   * deliberately not stored — a stored level is a second source of truth that
   * drifts out of step with the XP that earned it the first time a grant path
   * forgets to recompute it.
   */
  xp: number
  specialisations: CrewSpecialisation[]
  condition: CrewCondition
  /**
   * Wall-clock ms at which a non-`fit` condition lapses back to `fit`. Settled
   * lazily on load like every other real-time system in the game — nothing
   * ticks in the background. Absent while `condition` is `fit`.
   */
  recoveredAt?: number
  /** Wall-clock ms the crew member joined the roster. */
  joinedAt: number
  /**
   * True for crew the player trained themselves. Self-trained crew are exempt
   * from the hired-crew cap and from hire-cost escalation (STS-587).
   */
  selfTrained: boolean
  /**
   * Set for hired crew: what this hire cost, in francs. The quit refund and
   * the later re-hire price are both derived from it (the mortgage rule).
   * Absent for self-trained crew, who cost nothing to acquire.
   */
  hireCost?: number
}

/** Hired crew arrive already trained and instantly, at this level on CREW_XP_CURVE. */
export const HIRED_CREW_LEVEL = 3
/** Crew the player trains themselves start here. */
export const TRAINED_CREW_LEVEL = 1

// Fixed name pool, drawn combinatorially. A flat list of whole names would need
// to be enormous to make collisions rare; 48 given names x 40 surnames gives
// 1,920 distinct combinations, which is far more than any plausible roster and
// costs two short arrays. Names are deliberately plain — no callsigns, no lore.
export const CREW_GIVEN_NAMES: readonly string[] = [
  'Aina', 'Alex', 'Amara', 'Anders', 'Anja', 'Arun', 'Beatriz', 'Bo',
  'Camille', 'Chen', 'Dara', 'Diego', 'Ebba', 'Elif', 'Emeka', 'Esme',
  'Farid', 'Freya', 'Gabriel', 'Hana', 'Ingrid', 'Isa', 'Jonas', 'Juno',
  'Kai', 'Karin', 'Lars', 'Leila', 'Lena', 'Malik', 'Mira', 'Nadia',
  'Nils', 'Nour', 'Omar', 'Petra', 'Priya', 'Rafael', 'Ravi', 'Rune',
  'Sanna', 'Sora', 'Talia', 'Tomas', 'Vera', 'Yusuf', 'Zara', 'Zheng',
]

export const CREW_SURNAMES: readonly string[] = [
  'Adeyemi', 'Almeida', 'Bergstrom', 'Cardoso', 'Chandra', 'Dahl', 'Delacroix',
  'Eriksen', 'Farouk', 'Fontaine', 'Gudmundsson', 'Halvorsen', 'Hayashi',
  'Ibarra', 'Iyer', 'Jansen', 'Kaur', 'Keller', 'Kowalski', 'Lindqvist',
  'Marchetti', 'Mbeki', 'Moreau', 'Nakamura', 'Novak', 'Okafor', 'Olsen',
  'Petrov', 'Quintero', 'Rahman', 'Ramos', 'Sandoval', 'Sato', 'Sorensen',
  'Tanaka', 'Vargas', 'Virtanen', 'Wallace', 'Yilmaz', 'Zielinski',
]

/** Rovers and drones are equipment; they get a designation, not a person's name. */
export const ROVER_DESIGNATION_PREFIX = 'Rover'
export const DRONE_DESIGNATION_PREFIX = 'Drone'
