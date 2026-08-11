import { ROCKET_PRICES, STARTING_FRANCS } from '@/lib/data/economy'
import type { GameState, Player } from '@/game-context'
import { MISSIONS } from '@/lib/data'

const FIRST_MISSION = MISSIONS.find(m => m.sequence === 1) ?? MISSIONS[0]
const SECOND_MISSION = MISSIONS.find(m => m.sequence === 2) ?? MISSIONS[1] ?? FIRST_MISSION
const FIRST_MINERAL = Object.keys(FIRST_MISSION.requires.minerals)[0] ?? 'iron'
const SECOND_MINERAL = Object.keys(SECOND_MISSION.requires.minerals)[0] ?? 'silicon'
// M3 is the two-leg "mine then deliver" client choice — Belt Courier Run
// (Bennu -> Vesta) is the authored pick used for these dev shots.
const THIRD_MISSION = MISSIONS.find(m => m.id === 'lnm_m3_relay_bennu_vesta') ?? MISSIONS.find(m => m.sequence === 3) ?? SECOND_MISSION
const ROVER_MISSION = MISSIONS.find(m => m.survey?.onWorldVehicle === 'starter-rover') ?? THIRD_MISSION

const BASE_PLAYER: Player = {
  francs: 150_000_000,
  activeMission: null,
  missionCount: 1,
  pendingLaunch: false,
  placed: ['launchpad'],
  placementPlots: { launchpad: 0 },
  controlBuilt: false,
  missionsDone: 0,
  freeOperations: false,
  clientMissions: {},
  clientStreaks: {},
  clientCooldowns: {},
  researchAnnotations: 0,
  refineryBuilt: false,
  refineryUnlocked: false,
  refineryUnlockNotified: false,
  refineryQueue: [],
  refinedGoods: {},
  launchpadUpgraded: false,
  loanDebt: 0,
  loanOffered: false,
}

const M1_DONE: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true }
const M1_AND_M2_DONE: Record<number, boolean> = { ...M1_DONE, 20: true, 21: true }
const M1_M2_M3_DONE: Record<number, boolean> = { ...M1_AND_M2_DONE, 30: true, 31: true, 32: true }

// Story mission synthesized at runtime in game-context.tsx once free ops +
// the satellite monitoring station are unlocked — not in MISSIONS, so these
// presets set the ids directly rather than looking a mission up by sequence.
const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

const POST_ONBOARDING_PLAYER: Player = {
  ...BASE_PLAYER,
  missionsDone: 3,
  placed: ['launchpad', 'satellite-monitoring-station'],
  placementPlots: { launchpad: 0, 'satellite-monitoring-station': 1 },
  freeOperations: true,
  satelliteMonitoringBuilt: true,
  satelliteMonitoringLevel: 1,
  transitSatelliteLaunchedAt: null,
}

// Deep Space Telescope built alongside the transit satellite (STS-622) —
// asteroid-discovery presets need both instruments' unlock gates cleared,
// since deepSpaceTelescopeUnlocked() also checks satelliteMonitoringLevel.
const ASTEROID_DISCOVERY_PLAYER: Player = {
  ...POST_ONBOARDING_PLAYER,
  placed: [...POST_ONBOARDING_PLAYER.placed, 'deep-space-telescope'],
  placementPlots: { ...POST_ONBOARDING_PLAYER.placementPlots, 'deep-space-telescope': 2 },
  satelliteMonitoringLevel: 2,
  deepSpaceTelescopeBuilt: true,
  deepSpaceTelescopeLevel: 1,
  clientMissions: { 'helios-propulsion-depot': 2 },
}

// Academy management view: built + funded + one trained astronaut on the
// roster, so the "Recent UI" shot lands on the tabbed management screen
// (not the pre-build mission card) and the AcademyCoach fires on first load.
// clientMissions needs TWO clients at affinity level 2 (>=10 jobs each) —
// academyAffinityUnlocked() requires two, unlike the telescope's one.
const ACADEMY_PLAYER: Player = {
  ...POST_ONBOARDING_PLAYER,
  placed: [...POST_ONBOARDING_PLAYER.placed, 'astronaut-academy'],
  placementPlots: { ...POST_ONBOARDING_PLAYER.placementPlots, 'astronaut-academy': 2 },
  clientMissions: { 'helios-propulsion-depot': 10, 'arcturus-battery-systems': 10 },
  academyResearched: true,
  academyFunded: true,
  crew: [],
}

export interface DevShot {
  key: string
  label: string
  hint: string
  // Whether this preset's player.freeOperations is true (Free Ops / fully
  // post-tutorial) or false (still mid-onboarding, tutorial coach active) —
  // set explicitly per-shot from the actual resolvePreset() player state so
  // the DEV panel can't be misread as "tutorial fully finished" when a
  // preset is really mid-mission (see STS-635). Source of truth is each
  // preset's player.freeOperations below, not the group it lives in — some
  // groups (Recent UI) mix both stages.
  stage: 'tutorial' | 'free-ops'
}

export interface DevGroup {
  label: string
  color: string
  shots: DevShot[]
}

export const DEV_GROUPS: DevGroup[] = [
  {
    label: 'Mission 1',
    color: '#d97150',
    shots: [
      { key: 'm1-intro',  label: 'Intro',   hint: 'Fresh start, no progress', stage: 'tutorial' },
      { key: 'm1-hub',    label: 'Hub',     hint: 'Launchpad built, M1 coach active', stage: 'tutorial' },
      { key: 'm1-fab',    label: 'Fab',     hint: 'First generated mission + Eros picked, at fab', stage: 'tutorial' },
      { key: 'm1-mining', label: 'Mining',  hint: 'In mining with iron target', stage: 'tutorial' },
      { key: 'm1-debrief',label: 'Debrief', hint: 'Post-mine debrief, 6 iron', stage: 'tutorial' },
    ],
  },
  {
    label: 'Mission 2',
    color: '#3fa9ff',
    shots: [
      { key: 'm2-hub',    label: 'Hub',     hint: 'Prospector unlocked, M2 coach active', stage: 'tutorial' },
      { key: 'm2-rocket-buy', label: 'Rocket', hint: 'Second generated mission + Eros, Prospector purchase step', stage: 'tutorial' },
      { key: 'm2-fab',    label: 'Fab',     hint: 'Second generated mission + Eros after Prospector purchase', stage: 'tutorial' },
      { key: 'm2-mining', label: 'Mining',  hint: 'In mining with second generated target', stage: 'tutorial' },
      { key: 'm2-post-debrief', label: 'Done',  hint: 'Second mission complete, returned to hub with stash retained — M3 not yet started, Free Ops still locked', stage: 'tutorial' },
    ],
  },
  {
    label: 'Mission 3',
    color: '#c084fc',
    shots: [
      { key: 'm3-hub',     label: 'Hub',     hint: 'MID mission 3 (missionsDone: 2), M3 coach still active, Free Ops NOT unlocked yet — replay the two-leg client pick', stage: 'tutorial' },
      { key: 'm3-fab',     label: 'Fab',     hint: 'Belt Courier Run accepted (Bennu -> Vesta), at fab — still mid-tutorial', stage: 'tutorial' },
      { key: 'm3-mining',  label: 'Mining',  hint: 'In mining at Bennu, delivery leg to Vesta pending — still mid-tutorial', stage: 'tutorial' },
      { key: 'm3-debrief', label: 'Debrief', hint: 'Two-leg run complete, delivered at Vesta then returned — still mid-tutorial', stage: 'tutorial' },
    ],
  },
  {
    label: 'First Satellite Launch',
    color: '#f5d947',
    // Full walkable flow, in order: build SMS -> accept the fixed story
    // mission -> fab -> physical transit to Earth orbit (dev "Skip ▸" button
    // on that screen fast-forwards the ETA) -> debrief/satellite deployed ->
    // TESS Console, where "pointing" (PixiGalaxyStarMap) and "waiting for
    // the transit" (daily candidate rotation, keyed by calendar date) live —
    // that screen has its own dev-only "+1 DAY" control since it has no
    // in-scene timer to skip, unlike the rocket ETA. See the "Transit" vs
    // "transit-photometry" naming note in TransitScreen.tsx and the ZenNotes
    // decision doc for why these are two unrelated screens sharing a word.
    shots: [
      { key: 'telescope-hub',      label: 'Hub',      hint: 'Post-onboarding, Free Ops unlocked, monitoring station built, story mission on the board', stage: 'free-ops' },
      { key: 'telescope-fab',      label: 'Fab',      hint: 'Transit telescope mission accepted, at fab — post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'telescope-transit',  label: 'Transit',  hint: 'Rocket physically en route to Earth orbit to deploy the telescope — dev "Skip ▸" button fast-forwards this. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'telescope-debrief',  label: 'Debrief',  hint: 'Telescope deployed, satellite launched — post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-tess-discovery',  label: 'Console',  hint: 'Satellite already in orbit — point it (star map) and review the daily transit-photometry candidate. Stationary, no travel. Use the on-screen dev "+1 DAY" control to preview future days without waiting. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
    ],
  },
  {
    label: 'Recent UI',
    color: '#39d36a',
    shots: [
      { key: 'ui-mission-board', label: 'Mission Board', hint: 'Recent OD layout restyle with client cards — Free Ops unlocked, tutorial off', stage: 'free-ops' },
      { key: 'ui-skill-tree', label: 'Skill Tree', hint: 'License Grade and research XP progress screen — post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-target-picker', label: 'Target Picker', hint: 'Solar map target selection with a mission loaded — missionsDone: 2, Free Ops NOT unlocked', stage: 'tutorial' },
      { key: 'ui-tess-discovery', label: 'TESS Console', hint: 'Satellite monitoring and classification screen — post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-rover-mining', label: 'Rover Mining', hint: 'Starter-rover on-world mining timer state — missionsDone: 2, Free Ops NOT unlocked', stage: 'tutorial' },
      { key: 'ship-customizer', label: 'Ship Customiser', hint: 'Unlocked hangar interior view with Explorer room slots — missionsDone: 1, Free Ops NOT unlocked', stage: 'tutorial' },
      { key: 'ui-asteroid-discovery', label: 'Asteroid Discovery', hint: 'Deep Space Telescope built (STS-622) — live NEOCP candidate review, requires seeded asteroid_candidates on the shared backend. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-academy', label: 'Academy', hint: 'Astronaut Academy built + funded, two clients at affinity L2 — management view, AcademyCoach fires on first load. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
    ],
  },
]

export function resolvePreset(name: string): Partial<GameState> | null {
  switch (name) {
    // ── Mission 1 ──
    case 'm1-intro':
      return {
        screen: 'intro',
        player: { ...BASE_PLAYER, placed: [], placementPlots: {}, francs: STARTING_FRANCS },
        tutorial: true, doneSteps: {},
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 0 },
        tutorial: true, doneSteps: { 0: true },
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 0 },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` } },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-debrief':
      return {
        screen: 'debrief',
        player: { ...BASE_PLAYER, missionsDone: 0, stash: { [FIRST_MINERAL]: FIRST_MISSION.requires.minerals[FIRST_MINERAL] ?? 1 } },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: FIRST_MISSION.requires.minerals, popup: null,
      }

    // ── Mission 2 ──
    case 'm2-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: M1_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm2-rocket-buy':
      return {
        screen: 'rocket-buy',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: { ...M1_DONE, 20: true },
        missionId: SECOND_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm2-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 1, francs: BASE_PLAYER.francs - ROCKET_PRICES.prospector },
        tutorial: true, doneSteps: { ...M1_DONE, 20: true, 21: true },
        missionId: SECOND_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm2-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 1, activeMission: { id: SECOND_MISSION.id, label: `${SECOND_MISSION.title} → Eros` } },
        tutorial: true, doneSteps: { ...M1_DONE, 20: true, 21: true },
        missionId: SECOND_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm2-post-debrief':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 1, stash: { [SECOND_MINERAL]: SECOND_MISSION.requires.minerals[SECOND_MINERAL] ?? 1 }, lastClient: SECOND_MISSION.client },
        tutorial: false, doneSteps: M1_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: SECOND_MISSION.requires.minerals, popup: null,
      }

    // ── Mission 3 (two-leg "mine then deliver" client pick) ──
    case 'm3-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 2 },
        tutorial: true, doneSteps: M1_AND_M2_DONE,
        missionId: null, targetId: null, deliveryTargetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm3-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 2, francs: BASE_PLAYER.francs - ROCKET_PRICES.prospector },
        tutorial: true, doneSteps: { ...M1_AND_M2_DONE, 30: true, 31: true },
        missionId: THIRD_MISSION.id, targetId: THIRD_MISSION.targetId ?? 'bennu', deliveryTargetId: THIRD_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm3-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 2, activeMission: { id: THIRD_MISSION.id, label: `${THIRD_MISSION.title} → ${THIRD_MISSION.targetId}` } },
        tutorial: true, doneSteps: { ...M1_AND_M2_DONE, 30: true, 31: true, 32: true },
        missionId: THIRD_MISSION.id, targetId: THIRD_MISSION.targetId ?? 'bennu', deliveryTargetId: THIRD_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'm3-debrief':
      return {
        screen: 'debrief',
        player: { ...BASE_PLAYER, missionsDone: 2 },
        tutorial: true, doneSteps: { ...M1_AND_M2_DONE, 30: true, 31: true, 32: true },
        missionId: THIRD_MISSION.id, targetId: THIRD_MISSION.targetId ?? 'bennu', deliveryTargetId: THIRD_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: THIRD_MISSION.requires.minerals, popup: null,
      }

    // ── First Satellite Launch (post-onboarding story mission) ──
    case 'telescope-hub':
      return {
        screen: 'hub',
        player: POST_ONBOARDING_PLAYER,
        tutorial: false, doneSteps: M1_M2_M3_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'telescope-fab':
      return {
        screen: 'fab',
        player: POST_ONBOARDING_PLAYER,
        tutorial: false, doneSteps: M1_M2_M3_DONE,
        missionId: TRANSIT_TELESCOPE_MISSION_ID, targetId: TRANSIT_TELESCOPE_TARGET_ID,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'telescope-transit':
      {
        const transitStartedAt = Date.now() - 30_000
      return {
        screen: 'transit',
        player: { ...POST_ONBOARDING_PLAYER, activeMission: { id: TRANSIT_TELESCOPE_MISSION_ID, label: 'Launch Transit Telescope → Earth Orbit' }, transitStartedAt, arrivalAt: transitStartedAt + 90_000 },
        tutorial: false, doneSteps: M1_M2_M3_DONE,
        missionId: TRANSIT_TELESCOPE_MISSION_ID, targetId: TRANSIT_TELESCOPE_TARGET_ID,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }
      }

    case 'telescope-debrief':
      return {
        screen: 'debrief',
        player: { ...POST_ONBOARDING_PLAYER, transitSatelliteLaunchedAt: Date.now(), transitSatelliteLevel: 1 },
        tutorial: false, doneSteps: M1_M2_M3_DONE,
        missionId: TRANSIT_TELESCOPE_MISSION_ID, targetId: TRANSIT_TELESCOPE_TARGET_ID,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: {}, popup: null,
      }

    case 'ship-customizer':
      return {
        screen: 'hangar',
        player: {
          ...BASE_PLAYER,
          missionsDone: 1,
          skillPoints: 0,
          unlockedSkillNodes: ['ship-customizer-1'],
        },
        tutorial: false,
        doneSteps: M1_DONE,
        missionId: SECOND_MISSION.id,
        targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }

    // ── Recently overhauled UI surfaces ──
    case 'ui-mission-board':
      return {
        screen: 'missions',
        player: {
          ...BASE_PLAYER,
          missionsDone: 2,
          freeOperations: true,
          clientMissions: { 'helios-propulsion-depot': 2, 'lumen-research': 1 },
          lastClient: 'helios-propulsion-depot',
        },
        tutorial: false,
        doneSteps: M1_AND_M2_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-skill-tree':
      return {
        screen: 'skills',
        player: {
          ...POST_ONBOARDING_PLAYER,
          missionsDone: 3,
          researchXP: 260,
          skillPoints: 3,
          licenseGrade: 'Grade II',
          unlockedSkillNodes: ['laser-capacitor-1', 'ship-customizer-1'],
          refineryBuilt: true,
          launchpadUpgraded: true,
          transitSatelliteLaunchedAt: Date.now(),
        },
        tutorial: false,
        doneSteps: M1_M2_M3_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-target-picker':
      return {
        screen: 'targets',
        player: { ...BASE_PLAYER, missionsDone: 2 },
        tutorial: false,
        doneSteps: M1_AND_M2_DONE,
        missionId: THIRD_MISSION.id,
        targetId: null,
        deliveryTargetId: THIRD_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-tess-discovery':
      return {
        screen: 'galaxy',
        player: {
          ...POST_ONBOARDING_PLAYER,
          transitSatelliteLaunchedAt: Date.now() - 86_400_000,
          transitSatelliteLevel: 1,
          researchAnnotations: 3,
          researchXP: 180,
        },
        tutorial: false,
        doneSteps: M1_M2_M3_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-rover-mining':
      return {
        screen: 'rover-mining',
        player: {
          ...BASE_PLAYER,
          missionsDone: 2,
          activeMission: { id: ROVER_MISSION.id, label: `${ROVER_MISSION.title} → ${ROVER_MISSION.targetId ?? 'bennu'}` },
          roverMiningStartedAt: Date.now() - 45_000,
          roverTerrainClassifications: { [ROVER_MISSION.targetId ?? THIRD_MISSION.targetId ?? 'bennu']: 'vein' },
        },
        tutorial: false,
        doneSteps: M1_AND_M2_DONE,
        missionId: ROVER_MISSION.id,
        targetId: ROVER_MISSION.targetId ?? THIRD_MISSION.targetId ?? 'bennu',
        deliveryTargetId: ROVER_MISSION.deliveryTargetId ?? null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-asteroid-discovery':
      return {
        screen: 'asteroid-discovery',
        player: ASTEROID_DISCOVERY_PLAYER,
        tutorial: false,
        doneSteps: M1_M2_M3_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-academy':
      return {
        screen: 'academy',
        player: ACADEMY_PLAYER,
        tutorial: false,
        doneSteps: M1_M2_M3_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    default:
      return null
  }
}
