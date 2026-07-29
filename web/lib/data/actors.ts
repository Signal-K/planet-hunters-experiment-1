// The actor/character layer — the "who" that was entirely missing.
//
// Landnam had rockets, structures, targets and minerals as first-class
// catalogues, but nothing that said "an astronaut is a kind of character, and
// these are the places a character can be". Crew (STS-591) is the first thing
// that needs it: an astronaut is not a bespoke type, it is one archetype of a
// shared character concept alongside rovers and drones.
//
// This is a catalogue of archetypes, not of individuals. A concrete crew member
// is a `CrewMember` (see `crew.ts`); it points at an archetype through its
// `crewClass`. Same relationship as a placed structure to a
// `StructureBlueprint`.

import type { SceneLocation } from './scenes'
import type { CrewClass } from './crew'
import type { SkillBranch } from './skills'

/**
 * What kind of thing the actor is, physically. Drives where it can be and what
 * it can be asked to do — an astronaut needs a crewed vehicle and life support;
 * a rover is landed and stays; a drone is dispatched and returns.
 */
export type ActorArchetypeId = CrewClass

export interface ActorArchetype {
  id: ActorArchetypeId
  name: string
  /** Plural, for roster headers and counts. */
  plural: string
  /** True for actors that are people. Only these have names, fatigue and injury. */
  isPerson: boolean
  /** Locations this archetype may occupy. The roster UI and mission requirements both read this. */
  canOccupy: readonly SceneLocation[]
  /** Specialisation axes open to this archetype, from the existing skill branches. */
  specialisations: readonly SkillBranch[]
  /** Whether the archetype consumes daily upkeep while on the roster. */
  hasUpkeep: boolean
  /**
   * Astronauts, drones and rovers share one roster but are capped separately
   * (Q21). `null` means no hard ceiling — for astronauts the brake is
   * escalating hire cost plus the cap on crew you did not train yourself,
   * not a flat limit.
   *
   * Q21 established that the classes are capped separately but set no numbers;
   * Liam delegated them ("I don't care", 2026-07-29). Four each is a starting
   * position — retune freely on feedback, no decision needed.
   */
  rosterCap: number | null
  /** Cuts structure build time and cost. Drones do this; astronauts explicitly do not (Q19). */
  aidsConstruction: boolean
  /**
   * Can perceive things equipment cannot — anomalies, alien tech — on the
   * strength of human pattern recognition (Q19). Late-game; declared now so
   * the roster does not need reshaping when it lands.
   */
  perceivesAnomalies: boolean
  description: string
}

export const ACTOR_ARCHETYPES: readonly ActorArchetype[] = [
  {
    id: 'astronaut',
    name: 'Astronaut',
    plural: 'Astronauts',
    isPerson: true,
    // Astronauts ride a crewed vehicle out and come home; they are never left
    // on a target the way a rover is. Crew are never permanently lost, so a
    // destroyed ship returns its crew to Earth Base injured, not dead.
    canOccupy: ['earth-base', 'transit', 'orbit', 'target-surface'],
    specialisations: ['mining', 'cargo', 'range', 'engineering'],
    hasUpkeep: true,
    rosterCap: null,
    aidsConstruction: false,
    perceivesAnomalies: true,
    description: 'A named person on the roster. Hired at level 3 or trained from level 1. Can be fatigued or injured, never lost.',
  },
  {
    id: 'rover',
    name: 'Rover',
    plural: 'Rovers',
    isPerson: false,
    // A deployed rover stays on the surface it landed on — that is the whole
    // point of `roverDeployments`. It never returns to Earth Base.
    canOccupy: ['target-surface'],
    specialisations: ['mining', 'engineering'],
    hasUpkeep: false,
    rosterCap: 4,
    aidsConstruction: false,
    perceivesAnomalies: false,
    description: 'Landed surface equipment. Deployed once and stays, working after the ship comes home. Carries a designation, not a name.',
  },
  {
    id: 'drone',
    name: 'Drone',
    plural: 'Drones',
    isPerson: false,
    canOccupy: ['earth-base', 'orbit', 'target-surface'],
    specialisations: ['cargo', 'range'],
    hasUpkeep: false,
    rosterCap: 4,
    aidsConstruction: true,
    perceivesAnomalies: false,
    description: 'Dispatched and recovered. Not yet acquirable — declared so the roster does not need reshaping when it lands.',
  },
]

const BY_ID = new Map(ACTOR_ARCHETYPES.map(a => [a.id, a]))

export function getActorArchetype(id: ActorArchetypeId): ActorArchetype | undefined {
  return BY_ID.get(id)
}

/** Can this kind of actor be present at this location? */
export function actorCanOccupy(id: ActorArchetypeId, location: SceneLocation): boolean {
  return BY_ID.get(id)?.canOccupy.includes(location) ?? false
}

/** Archetypes that may appear at a location — what a scene should expect to render. */
export function archetypesAtLocation(location: SceneLocation): ActorArchetype[] {
  return ACTOR_ARCHETYPES.filter(a => a.canOccupy.includes(location))
}

/** Is this specialisation branch open to this archetype? Gates crew training and mission requirements. */
export function archetypeSupportsSpecialisation(id: ActorArchetypeId, branch: SkillBranch): boolean {
  return BY_ID.get(id)?.specialisations.includes(branch) ?? false
}

/** Only people accrue fatigue and injury — equipment has no condition track. */
export function archetypeHasCondition(id: ActorArchetypeId): boolean {
  return BY_ID.get(id)?.isPerson ?? false
}

/**
 * Is there room on the roster for another of this archetype? Each class is
 * capped separately (Q21). Astronauts have no hard ceiling — escalating hire
 * cost is their brake — so this is always true for them.
 */
export function rosterHasRoomFor(id: ActorArchetypeId, currentCount: number): boolean {
  const cap = BY_ID.get(id)?.rosterCap
  return cap === undefined ? false : cap === null || currentCount < cap
}
