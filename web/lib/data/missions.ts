// Landnam game data — mission fallback assembled by the deterministic generator

import { missionPayoutFloor, normalizeMissionPayout } from './payouts'
import type { Mission } from './types'
import authoredDeclarations from './authored-missions.json'
import { CLIENT_SLOTS } from './clients'
import { MINERAL_META } from './minerals'
import { ROCKET_MODELS } from './rockets'
import { isOrionidsWindow } from './sky-events'
import {
  DEFAULT_MISSION_TEMPLATES,
  FREE_OPS_MISSION_SEQUENCE,
  FREE_OPS_START_MISSIONS_DONE,
  OFFLINE_MISSION_COUNT,
  generateFreeOpsMissionsFromRules,
  generateMissionsFromRules,
  generateSelfDirectedMiningPoolFromRules,
} from './mission-generator'

export { FREE_OPS_MISSION_SEQUENCE, FREE_OPS_START_MISSIONS_DONE, OFFLINE_MISSION_COUNT }
export { tutorialClientMissionOptions } from './mission-generator'
export const MISSION_TEMPLATES = DEFAULT_MISSION_TEMPLATES

export function generateMissions(count = OFFLINE_MISSION_COUNT): Mission[] {
  // The Transport lesson is exclusively the authored transport-client list
  // below — drop any generically-generated band at that sequence so its board
  // only ever shows the curated client choices.
  return generateMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META }, count)
    .filter(m => m.sequence !== TRANSPORT_SEQUENCE)
}

export function generateFreeOpsMissions(): Mission[] {
  return generateFreeOpsMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META })
}

// Renewable self-directed mining pool — reuses Free Ops' template pool,
// rotation cadence, and mineral-eligibility filtering (see
// generateSelfDirectedMiningPoolFromRules), but never assigns a client. This
// is the pool form of the mechanic; SELF_DIRECTED_MINING_MISSION_ID above
// remains as the fixed M3-adjacent tutorial intro to it.
export function generateSelfDirectedMiningPool(now: number = Date.now()): Mission[] {
  const pool = generateSelfDirectedMiningPoolFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META })
  return isOrionidsWindow(now) ? [...pool, orionidsNightRun()] : pool
}

// SSL-578: Orionids Free Ops run, on the board only during the shower window.
export const ORIONIDS_NIGHT_RUN_ID = 'self-directed-orionids-night-run'
export const ORIONIDS_SURFACE_RESEARCH_MISSION_ID = 'self-directed-orionids-surface-research'

/** Fragments the shower run asks for. The 20 is catches stored on the player, any hour in the window. Fragments take no cargo. */
export const ORIONIDS_FRAGMENT_GOAL = 20

export function orionidsNightRun(): Mission {
  const amount = ORIONIDS_FRAGMENT_GOAL
  const debris = MINERAL_META.orionid_debris
  return {
    id: ORIONIDS_NIGHT_RUN_ID,
    title: 'Orionids shower run',
    brief: `No client. Launch through the shower and catch ${amount} Orionid fragments. Event evidence is protected and is the only collection objective. Peak night pays double. One fireball fragment falls at 02:00 on 22 Oct.`,
    tag: 'FREE OPS',
    difficulty: 'L1',
    locked: false,
    sequence: FREE_OPS_MISSION_SEQUENCE,
    unlockAt: 'Reach Free Operations',
    // The shower is collected during ascent; Eros supplies the ordinary
    // starter-compatible mining leg so the run can use the normal loop.
    targetId: 'eros',
    // Event evidence is not an ordinary cargo haul. Do not ask the player to choose hydrogen or reserve hold space.
    requires: { minerals: { orionid_debris: amount }, cargo_min: 0, drill_tier: 1, max_orbit: 5 },
    payout: { francs: normalizeMissionPayout((debris?.price ?? 0) * amount, FREE_OPS_MISSION_SEQUENCE), affinity: 0 },
  }
}

/** The second Orionids tier deliberately changes activity: observe the marked
 * surface with the rover instead of running another mining pass. */
export function orionidsSurfaceResearchMission(): Mission {
  return {
    id: ORIONIDS_SURFACE_RESEARCH_MISSION_ID,
    title: 'Orionids surface observation',
    brief: 'Drive the rover to the marked Orionids outcrop and log the blue fracture pattern for the community research record.',
    tag: 'EVENT RESEARCH',
    difficulty: 'L1',
    locked: false,
    sequence: FREE_OPS_MISSION_SEQUENCE,
    unlockAt: 'Complete the Orionids debris capture',
    targetId: 'eros',
    payload: { type: 'rover', name: 'Orionids field rover', cargoCost: 0 },
    survey: {
      scanRequired: true,
      scanCount: 1,
      scanSource: 'rover',
      depositsToMap: 1,
      revealsMinerals: false,
      revealsLandmarks: ['Orionids fracture outcrop'],
      unlocksLanding: false,
      onWorldVehicle: 'starter-rover',
    },
    requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 5 },
    payout: { francs: 0, affinity: 0 },
  }
}

// Transport lesson (SSL-332 onboarding mission 2, formerly M3): the player
// picks between two clients offering a two-leg transport job (mine at the
// pickup target, deliver to a second target, then fly home). The old M2
// Prospector bulk-haul mission it replaced is retired; self-directed mining
// lives in Free Ops (see generateFreeOpsMissions).
export const TRANSPORT_SEQUENCE = 2

/** A mission as written in shared/authoring/missions/*.toml and compiled to authored-missions.json. */
interface AuthoredMissionDeclaration {
  id: string
  title: string
  brief: string
  tag: string
  difficulty: string
  client?: string
  locked: boolean
  sequence: number | 'transport' | 'free-ops'
  unlock_at?: string
  target?: string
  delivery_target?: string
  requires: { minerals: Record<string, number>; cargo_min: number; drill_tier: number; max_orbit: number }
  payout: { francs?: number; floor_sequence?: number; affinity: number }
}

const AUTHORED_DECLARATIONS = (authoredDeclarations as unknown as { missions: AuthoredMissionDeclaration[] }).missions

/** Named sequences follow the game's own constants, so retuning them retunes authored missions too. */
const NAMED_SEQUENCES = { transport: TRANSPORT_SEQUENCE, 'free-ops': FREE_OPS_MISSION_SEQUENCE } as const

export function missionFromDeclaration(d: AuthoredMissionDeclaration): Mission {
  return {
    id: d.id,
    title: d.title,
    brief: d.brief,
    ...(d.client !== undefined && { client: d.client }),
    tag: d.tag,
    difficulty: d.difficulty,
    locked: d.locked,
    sequence: typeof d.sequence === 'number' ? d.sequence : NAMED_SEQUENCES[d.sequence],
    ...(d.unlock_at !== undefined && { unlockAt: d.unlock_at }),
    ...(d.target !== undefined && { targetId: d.target }),
    ...(d.delivery_target !== undefined && { deliveryTargetId: d.delivery_target }),
    requires: { minerals: { ...d.requires.minerals }, cargo_min: d.requires.cargo_min, drill_tier: d.requires.drill_tier, max_orbit: d.requires.max_orbit },
    payout: { francs: d.payout.francs ?? missionPayoutFloor(d.payout.floor_sequence ?? 1), affinity: d.payout.affinity },
  }
}

/** One mission from shared/authoring/missions. Edit the TOML, then `npm run authoring:compile` (the Scene Studio does it on save). */
export function authoredMission(id: string): Mission {
  const declaration = AUTHORED_DECLARATIONS.find(d => d.id === id)
  if (!declaration) throw new Error(`mission "${id}" is not in shared/authoring/missions; run npm run authoring:compile`)
  return missionFromDeclaration(declaration)
}

// Free Ops self-directed mining — no client, no daily limit, no cooldown.
export const SELF_DIRECTED_MINING_MISSION_ID = 'freeops-self-directed-mining'
export const RESOURCE_FOCUS_MISSION_ID = 'focus-resource-mining'
export const ACADEMY_INTRO_MISSION_ID = 'story-astronaut-academy'

const remoteSiloBlueprint = { requiredMaterials: { aluminium: 18, iron: 12, copper: 6 } }

function materialRequirement(materials: Record<string, number>): { minerals: Record<string, number>; cargo_min: number } {
  return {
    minerals: { ...materials },
    // The kit must fit the biggest vehicle the player can launch: a 36U kit against an 18U Surveyor made these steps unflyable.
    cargo_min: Math.min(
      Object.values(materials).reduce((total, amount) => total + amount, 0),
      Math.max(...ROCKET_MODELS.filter(rocket => !rocket.locked).map(rocket => rocket.stats.cargo)),
    ),
  }
}

/** Player-program construction is owned work, so it awards infrastructure
 * rather than a client fee. Keep its costs aligned with the blueprints. */
export const OWN_PROGRAM_BUILD_MISSIONS: Mission[] = [
  {
    id: 'program-build-mars-mining-settlement', title: 'Establish Mars Mining Settlement',
    brief: 'Carry a starter settlement kit to the program’s assigned Mars area. The permanent site anchors later extraction and support structures.',
    tag: 'PROGRAM', difficulty: 'L1', locked: false, sequence: FREE_OPS_MISSION_SEQUENCE,
    unlockAt: 'Reach Free Operations · Mars allocation ready', targetId: 'mars',
    construction: { structureKind: 'mining-settlement', requiredMaterials: { aluminium: 12, iron: 16, silicon: 8 }, placementMode: 'confirm', buildTimeMs: 45 * 60 * 1000 },
    programReward: { researchXP: 0, outcome: 'Mars mining settlement established · permanent program site online' },
    requires: { ...materialRequirement({ aluminium: 12, iron: 16, silicon: 8 }), drill_tier: 1, max_orbit: 4 }, payout: { francs: 0, affinity: 0 },
  },
  {
    id: 'program-build-remote-silo',
    title: 'Build a Remote Mineral Silo',
    brief: 'Send construction materials to a target with build rights. The sealed silo stores your extracted ore off-world instead of forcing every haul into an Earth sale.',
    tag: 'PROGRAM', difficulty: 'L2', locked: false,
    sequence: FREE_OPS_MISSION_SEQUENCE,
    unlockAt: 'Reach Free Operations',
    construction: { structureKind: 'mineral-silo', requiredMaterials: { ...remoteSiloBlueprint.requiredMaterials }, placementMode: 'confirm', buildTimeMs: 45 * 60 * 1000 },
    programReward: { researchXP: 0, outcome: 'Remote Mineral Silo commissioned · ore can be held at the selected target' },
    requires: { ...materialRequirement(remoteSiloBlueprint.requiredMaterials), drill_tier: 1, max_orbit: 5 },
    payout: { francs: 0, affinity: 0 },
  },
]

export const AUTHORED_MISSIONS: Mission[] = [
  ...OWN_PROGRAM_BUILD_MISSIONS,
  {
    id: ACADEMY_INTRO_MISSION_ID,
    title: 'Train the First Astronaut',
    brief: 'Establish the Astronaut Academy at Base, fund its first day-long session, and graduate a named astronaut into your roster.',
    tag: 'STORY',
    difficulty: 'L1',
    locked: true,
    sequence: FREE_OPS_MISSION_SEQUENCE,
    unlockAt: 'Reach client level 2 with two clients',
    requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 0 },
    programReward: {
      researchXP: 0,
      outcome: 'Astronaut Academy online · crew training unlocked',
    },
    payout: { francs: 0, affinity: 0 },
  },
  authoredMission('lnm_m3_relay_bennu_vesta'),
  {
    id: 'lnm_m3_relay_itokawa_eros',
    title: 'Nickel Line Handoff',
    brief: 'Helioforge Metals needs nickel pulled from Itokawa, then handed off at Eros before you fly home. You\'re paid for both jobs: mining the ore and running the relay to Eros.',
    client: 'helioforge-metals',
    tag: 'TRANSPORT',
    difficulty: 'L1',
    locked: false,
    sequence: TRANSPORT_SEQUENCE,
    unlockAt: 'Complete 1 contract',
    targetId: 'itokawa',
    deliveryTargetId: 'eros',
    requires: {
      minerals: { nickel: 3 },
      cargo_min: 3,
      drill_tier: 1,
      max_orbit: 4,
    },
    payout: {
      // Transport still pays the old M3 contract fee: it is two jobs (mining
      // plus relay) and still needs a fresh single-use vehicle.
      francs: missionPayoutFloor(3),
      affinity: 3,
    },
  },
  {
    id: 'lnm_relay_psyche_ceres',
    title: 'Deep-Core Relay',
    brief: 'Kepler Materials needs nickel and cobalt extracted at 16 Psyche, then ferried onward to their Ceres depot before you fly home. You\'re paid for both jobs: mining the ore and running the relay to Ceres.',
    client: 'kepler-materials',
    tag: 'TRANSPORT',
    difficulty: 'L2',
    locked: false,
    sequence: FREE_OPS_MISSION_SEQUENCE,
    unlockAt: 'Reach Free Operations',
    targetId: 'psyche',
    deliveryTargetId: 'ceres',
    requires: {
      minerals: { nickel: 2, cobalt: 2 },
      cargo_min: 4,
      // cobalt's laserAccess is 2 (see minerals.ts) — a tier-1 drill can
      // never physically reach cobalt-depth ore, so this floor must match.
      drill_tier: 2,
      max_orbit: 5,
    },
    payout: {
      francs: missionPayoutFloor(4),
      affinity: 4,
    },
  },
  // Free Ops self-directed mining: shared/authoring/missions/free-mining.toml
  authoredMission(SELF_DIRECTED_MINING_MISSION_ID),
  {
    id: 'freeops-crewed-prospecting',
    title: 'Crewed Prospecting Flight',
    brief: 'Ferrum wants a trained mining specialist aboard to assess a surface before automated construction begins. The first qualified astronaut to reach Eros earns a frontier bonus.',
    client: 'ferrum-orbital-construction',
    tag: 'CREW',
    difficulty: 'L2',
    locked: false,
    sequence: FREE_OPS_MISSION_SEQUENCE,
    unlockAt: 'Build the Astronaut Academy and fit Crew Quarters',
    targetId: 'eros',
    requires: {
      minerals: { nickel: 2 },
      cargo_min: 2,
      drill_tier: 1,
      max_orbit: 2,
      crew: { branch: 'mining', minTier: 1, minLevel: 1 },
    },
    payout: { francs: missionPayoutFloor(4), affinity: 4 },
  },
]

export const MISSIONS: Mission[] = [...generateMissions(), ...AUTHORED_MISSIONS, ...generateFreeOpsMissions(), ...generateSelfDirectedMiningPool()]
