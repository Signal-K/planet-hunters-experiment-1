// Landnam game data — mission fallback assembled by the deterministic generator

import { missionPayoutFloor } from './payouts'
import type { Mission } from './types'
import { CLIENT_SLOTS } from './clients'
import { MINERAL_META } from './minerals'
import {
  DEFAULT_MISSION_TEMPLATES,
  FREE_OPS_START_MISSIONS_DONE,
  OFFLINE_MISSION_COUNT,
  generateFreeOpsMissionsFromRules,
  generateMissionsFromRules,
} from './mission-generator'

export { FREE_OPS_START_MISSIONS_DONE, OFFLINE_MISSION_COUNT }
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

// M3 onboarding: the player picks between two clients offering a
// two-leg transport job (mine at the pickup target, deliver to a second
// target, then fly home) — the self-directed "Independent Prospect" custom
// mining mission that used to fill this slot has been cut; self-directed
// mining now lives in Free Ops instead (see generateFreeOpsMissions).
export const M3_SEQUENCE = 3

// Free Ops self-directed mining — no client, no daily limit, no cooldown.
export const SELF_DIRECTED_MINING_MISSION_ID = 'freeops-self-directed-mining'

export const AUTHORED_MISSIONS: Mission[] = [
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
      // M3 still forces a fresh SR2 purchase (rockets are single-use), so
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
      // M3 still forces a fresh SR2 purchase (rockets are single-use), so
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
]

export const MISSIONS: Mission[] = [...generateMissions(), ...AUTHORED_MISSIONS, ...generateFreeOpsMissions()]
