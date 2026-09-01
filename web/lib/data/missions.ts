// Landnam game data — mission fallback assembled by the deterministic generator

import { missionPayoutFloor } from './payouts'
import type { Mission } from './types'
import { CLIENT_SLOTS } from './clients'
import { MINERAL_META } from './minerals'
import { STRUCTURES } from './structures'
import {
  DEFAULT_MISSION_TEMPLATES,
  FREE_OPS_START_MISSIONS_DONE,
  OFFLINE_MISSION_COUNT,
  generateFreeOpsMissionsFromRules,
  generateMissionsFromRules,
  generateSelfDirectedMiningPoolFromRules,
} from './mission-generator'

export { FREE_OPS_START_MISSIONS_DONE, OFFLINE_MISSION_COUNT }
export { tutorialClientMissionOptions } from './mission-generator'
export const MISSION_TEMPLATES = DEFAULT_MISSION_TEMPLATES

export function generateMissions(count = OFFLINE_MISSION_COUNT): Mission[] {
  // Sequence 3 (M3) is exclusively the authored transport-client list
  // above — drop any generically-generated sequence-3 bands so the M3 board
  // only ever shows the curated client choices.
  return generateMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META }, count)
    .filter(m => m.sequence !== 3)
}

export function generateFreeOpsMissions(): Mission[] {
  return generateFreeOpsMissionsFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META })
}

// Renewable self-directed mining pool — reuses Free Ops' template pool,
// rotation cadence, and mineral-eligibility filtering (see
// generateSelfDirectedMiningPoolFromRules), but never assigns a client. This
// is the pool form of the mechanic; SELF_DIRECTED_MINING_MISSION_ID above
// remains as the fixed M3-adjacent tutorial intro to it.
export function generateSelfDirectedMiningPool(): Mission[] {
  return generateSelfDirectedMiningPoolFromRules({ clients: CLIENT_SLOTS, minerals: MINERAL_META })
}

// M3 onboarding: the player picks between two clients offering a
// two-leg transport job (mine at the pickup target, deliver to a second
// target, then fly home) — the self-directed "Independent Prospect" custom
// mining mission that used to fill this slot has been cut; self-directed
// mining now lives in Free Ops instead (see generateFreeOpsMissions).
export const M3_SEQUENCE = 3

// Free Ops self-directed mining — no client, no daily limit, no cooldown.
export const SELF_DIRECTED_MINING_MISSION_ID = 'freeops-self-directed-mining'
export const ACADEMY_INTRO_MISSION_ID = 'story-astronaut-academy'
export const REFINERY_BUILD_MISSION_ID = 'program-build-refinery'
export const SCAN_STATION_BUILD_MISSION_ID = 'program-build-scan-station'

const refineryBlueprint = STRUCTURES.find(structure => structure.id === 'refinery')!
const scanStationBlueprint = STRUCTURES.find(structure => structure.id === 'scan-station')!
const remoteSiloBlueprint = { requiredMaterials: { aluminium: 18, iron: 12, copper: 6 } }

function materialRequirement(materials: Record<string, number>): { minerals: Record<string, number>; cargo_min: number } {
  return {
    minerals: { ...materials },
    cargo_min: Object.values(materials).reduce((total, amount) => total + amount, 0),
  }
}

/** Earth Base construction is owned work, so it awards the structure rather
 * than a client fee or affinity. Keep its costs aligned with the blueprints. */
export const OWN_PROGRAM_BUILD_MISSIONS: Mission[] = [
  {
    id: 'program-build-remote-silo',
    title: 'Build a Remote Mineral Silo',
    brief: 'Send construction materials to a target with build rights. The sealed silo stores your extracted ore off-world instead of forcing every haul into an Earth sale.',
    tag: 'PROGRAM', difficulty: 'L2', locked: false,
    sequence: FREE_OPS_START_MISSIONS_DONE + 1,
    unlockAt: 'Reach Free Operations',
    construction: { structureKind: 'mineral-silo', requiredMaterials: { ...remoteSiloBlueprint.requiredMaterials }, placementMode: 'confirm', buildTimeMs: 45 * 60 * 1000 },
    programReward: { researchXP: 0, outcome: 'Remote Mineral Silo commissioned · ore can be held at the selected target' },
    requires: { ...materialRequirement(remoteSiloBlueprint.requiredMaterials), drill_tier: 1, max_orbit: 5 },
    payout: { francs: 0, affinity: 0 },
  },
  {
    id: REFINERY_BUILD_MISSION_ID,
    title: 'Build the Refinery',
    brief: 'Use your stored aluminium and copper to build the Earth Base refinery. It converts raw ore into higher-value materials for your program.',
    tag: 'PROGRAM',
    difficulty: 'L1',
    locked: false,
    sequence: FREE_OPS_START_MISSIONS_DONE + 1,
    unlockAt: 'Reach Free Operations',
    construction: {
      structureKind: refineryBlueprint.kind,
      requiredMaterials: { ...(refineryBlueprint.costMaterials ?? {}) },
      placementMode: 'confirm',
      buildTimeMs: 0,
    },
    programReward: {
      researchXP: 0,
      outcome: 'Refinery built · raw ore can now be processed at Earth Base',
    },
    requires: {
      ...materialRequirement(refineryBlueprint.costMaterials ?? {}),
      drill_tier: 1,
      max_orbit: 0,
    },
    payout: { francs: 0, affinity: 0 },
  },
  {
    id: SCAN_STATION_BUILD_MISSION_ID,
    title: 'Build the Scanning Station',
    brief: 'Commission the Scan Station at Earth Base. Its remote instruments map deposits, craters, and landmarks for your own program.',
    tag: 'PROGRAM',
    difficulty: 'L1',
    locked: false,
    sequence: FREE_OPS_START_MISSIONS_DONE + 1,
    unlockAt: 'Reach Free Operations and complete the commissioning pass',
    construction: {
      structureKind: scanStationBlueprint.kind,
      requiredMaterials: { ...(scanStationBlueprint.costMaterials ?? {}) },
      placementMode: 'confirm',
      buildTimeMs: 0,
    },
    programReward: {
      researchXP: 0,
      outcome: 'Scanning Station built · remote target mapping is now available',
    },
    requires: {
      ...materialRequirement(scanStationBlueprint.costMaterials ?? {}),
      drill_tier: 1,
      max_orbit: 0,
    },
    payout: { francs: 0, affinity: 0 },
  },
]

export const AUTHORED_MISSIONS: Mission[] = [
  ...OWN_PROGRAM_BUILD_MISSIONS,
  {
    id: ACADEMY_INTRO_MISSION_ID,
    title: 'Train the First Astronaut',
    brief: 'Establish the Astronaut Academy at Earth Base, fund its first day-long session, and graduate a named astronaut into your roster.',
    tag: 'STORY',
    difficulty: 'L1',
    locked: true,
    sequence: FREE_OPS_START_MISSIONS_DONE + 1,
    unlockAt: 'Reach affinity level 2 with two clients',
    requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 0 },
    programReward: {
      researchXP: 0,
      outcome: 'Astronaut Academy online · crew training unlocked',
    },
    payout: { francs: 0, affinity: 0 },
  },
  {
    id: 'lnm_m3_relay_bennu_vesta',
    title: 'Belt Courier Run',
    brief: 'Atlas Aggregate needs iron and carbon lifted from Bennu, then dropped at their Vesta depot for off-world construction — bulk metals like these are too plentiful on Earth to ship home, but Vesta has none. You\'re paid for both jobs: mining the ore and running the relay to Vesta.',
    client: 'atlas-aggregate',
    tag: 'TRANSPORT',
    difficulty: 'L1',
    locked: false,
    sequence: M3_SEQUENCE,
    unlockAt: 'Complete 2 contracts',
    targetId: 'bennu',
    deliveryTargetId: 'vesta',
    requires: {
      minerals: { iron: 3, carbon: 2 },
      cargo_min: 5,
      drill_tier: 1,
      max_orbit: 4,
    },
    payout: {
      // M3 still forces a fresh Prospector purchase (rockets are single-use), so
      // this rides the shared sequence-3 contract fee, which clears that cost
      // the same way M1/M2's do without ballooning into a jackpot.
      francs: missionPayoutFloor(3),
      affinity: 3,
    },
  },
  {
    id: 'lnm_m3_relay_itokawa_eros',
    title: 'Nickel Line Handoff',
    brief: 'Helioforge Metals needs nickel pulled from Itokawa, then handed off at Eros before you fly home. You\'re paid for both jobs: mining the ore and running the relay to Eros.',
    client: 'helioforge-metals',
    tag: 'TRANSPORT',
    difficulty: 'L1',
    locked: false,
    sequence: M3_SEQUENCE,
    unlockAt: 'Complete 2 contracts',
    targetId: 'itokawa',
    deliveryTargetId: 'eros',
    requires: {
      minerals: { nickel: 3 },
      cargo_min: 3,
      drill_tier: 1,
      max_orbit: 4,
    },
    payout: {
      // M3 still forces a fresh Prospector purchase (rockets are single-use), so
      // this rides the shared sequence-3 contract fee, which clears that cost
      // the same way M1/M2's do without ballooning into a jackpot.
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
    sequence: FREE_OPS_START_MISSIONS_DONE + 1,
    unlockAt: 'Complete 3 contracts',
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
  // Free Ops self-directed mining: no client, no daily limit, no cooldown —
  // the player picks any reachable target and sells the haul themselves at
  // market price. This is the self-directed mining teaching moment that used
  // to fill the M3 onboarding slot before M3 became a client transport job.
  {
    id: SELF_DIRECTED_MINING_MISSION_ID,
    title: 'Self-Directed Mining Run',
    brief: 'No client, no daily limit. Pick any reachable target, mine what looks valuable, and sell the haul yourself at market price.',
    tag: 'FREE OPS',
    difficulty: 'L2',
    locked: false,
    sequence: FREE_OPS_START_MISSIONS_DONE + 1,
    unlockAt: 'Complete M3',
    requires: {
      // Sold at market on Earth return, so this must avoid earthAbundant
      // minerals (iron, silicon, carbon, ...) — Earth already has plenty.
      minerals: { nickel: 2, cobalt: 2 },
      cargo_min: 4,
      // cobalt's laserAccess is 2 (see minerals.ts) — same floor as above.
      drill_tier: 2,
      max_orbit: 8,
    },
    payout: {
      francs: 0,
      affinity: 0,
    },
  },
  {
    id: 'freeops-crewed-prospecting',
    title: 'Crewed Prospecting Flight',
    brief: 'Ferrum wants a trained mining specialist aboard to assess a surface before automated construction begins. The first qualified astronaut to reach Eros earns a frontier bonus.',
    client: 'ferrum-orbital-construction',
    tag: 'CREW',
    difficulty: 'L2',
    locked: false,
    sequence: FREE_OPS_START_MISSIONS_DONE + 1,
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
