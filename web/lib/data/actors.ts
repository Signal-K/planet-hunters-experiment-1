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
