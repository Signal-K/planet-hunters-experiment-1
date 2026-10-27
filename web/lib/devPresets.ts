import { ROCKET_PRICES, STARTING_FRANCS } from '@/lib/data/economy'
import type { GameState, Player } from '@/game-context'
import { MISSIONS } from '@/lib/data'
import { ORIONIDS_NIGHT_RUN_ID, ORIONIDS_SURFACE_RESEARCH_MISSION_ID } from '@/lib/data/missions'
import { isSandboxName, resolveSandbox } from '@/lib/sandbox'

const FIRST_MISSION = MISSIONS.find(m => m.sequence === 1) ?? MISSIONS[0]
const FIRST_MINERAL = Object.keys(FIRST_MISSION.requires.minerals)[0] ?? 'iron'
// SSL-332 Transport lesson (guided mission 2) is the two-leg "mine then
// deliver" client choice — Belt Courier Run (Bennu -> Vesta) is the authored
// pick used for these dev shots.
const TRANSPORT_MISSION = MISSIONS.find(m => m.id === 'lnm_m3_relay_bennu_vesta') ?? MISSIONS.find(m => m.sequence === 2) ?? FIRST_MISSION

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

const EXTRACTION_DONE: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 8: true, 9: true }
const TRANSPORT_DONE: Record<number, boolean> = { ...EXTRACTION_DONE, 30: true, 31: true, 32: true, 33: true }
const TRAINING_DONE: Record<number, boolean> = { ...TRANSPORT_DONE, 40: true, 41: true }

// Story mission synthesized at runtime in game-context.tsx once free ops +
// the space telescope are unlocked — not in MISSIONS, so these
// presets set the ids directly rather than looking a mission up by sequence.
const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

const POST_ONBOARDING_PLAYER: Player = {
  ...BASE_PLAYER,
  missionsDone: 3,
  placed: ['launchpad', 'transit-telescope'],
  placementPlots: { launchpad: 0, 'transit-telescope': 1 },
  freeOperations: true,
  transitSatelliteLevel: 1,
  transitSatelliteLaunchedAt: null,
}

// Space Telescope built alongside the transit satellite (STS-622) —
// asteroid-discovery presets need both instruments' unlock gates cleared,
// since deepSpaceTelescopeUnlocked() also checks transitSatelliteLevel.
const ASTEROID_DISCOVERY_PLAYER: Player = {
  ...POST_ONBOARDING_PLAYER,
  placed: [...POST_ONBOARDING_PLAYER.placed, 'deep-space-telescope'],
  placementPlots: { ...POST_ONBOARDING_PLAYER.placementPlots, 'deep-space-telescope': 2 },
  transitSatelliteLevel: 2,
  deepSpaceTelescopeBuilt: true,
  deepSpaceTelescopeLevel: 1,
  clientMissions: { 'helios-propulsion-depot': 2 },
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
    label: 'Extraction',
    color: '#50d9bc',
    shots: [
      { key: 'm1-intro',  label: 'Intro',   hint: 'Fresh start, no progress', stage: 'tutorial' },
      { key: 'm1-hub',    label: 'Hub',     hint: 'Launchpad built, Extraction coach active', stage: 'tutorial' },
      { key: 'm1-fab',    label: 'Fab',     hint: 'First generated mission + Eros picked, at fab', stage: 'tutorial' },
      { key: 'm1-mining', label: 'Mining',  hint: 'In mining with iron target', stage: 'tutorial' },
      { key: 'm1-debrief',label: 'Debrief', hint: 'Post-mine debrief, 6 iron', stage: 'tutorial' },
      { key: 'm1-return', label: 'Return',  hint: 'Flying home with the haul', stage: 'tutorial' },
      { key: 'm1-home',   label: 'Home',    hint: 'Touchdown on the pad, delivery sheet', stage: 'tutorial' },
    ],
  },
  {
    label: 'Transport',
    color: '#91ccef',
    shots: [
      { key: 'transport-hub',     label: 'Hub',     hint: 'Extraction done (missionsDone: 1), Transport coach active — pick the two-leg client job', stage: 'tutorial' },
      { key: 'transport-fab',     label: 'Fab',     hint: 'Belt Courier Run accepted (Bennu -> Vesta), at fab', stage: 'tutorial' },
      { key: 'transport-mining',  label: 'Mining',  hint: 'In mining at Bennu, delivery leg to Vesta pending', stage: 'tutorial' },
      { key: 'transport-delivery', label: 'Delivery', hint: 'Cargo transfer at Vesta with mixed cargo (ordered + leftover minerals)', stage: 'tutorial' },
      { key: 'transport-debrief', label: 'Debrief', hint: 'Two-leg run complete, delivered at Vesta then returned', stage: 'tutorial' },
    ],
  },
  {
    label: 'Storage Silo',
    color: '#39d3b4',
    shots: [
      { key: 'storage-hub',   label: 'Hub',   hint: 'Both guided missions done (missionsDone: 2), no silo yet — Storage coach active, Free Ops still locked', stage: 'tutorial' },
      { key: 'storage-build', label: 'Build', hint: 'Build screen with the Surface Silo ready to place — placing it opens Free Ops', stage: 'tutorial' },
    ],
  },
  {
    label: 'First Satellite Launch',
    color: '#f5d947',
    // Full walkable flow, in order: accept the fixed telescope story
    // mission -> fab -> physical transit to Earth orbit (dev "Skip ▸" button
    // on that screen fast-forwards the ETA) -> debrief/satellite deployed ->
    // TESS Console, where "pointing" (PixiGalaxyStarMap) and "waiting for
    // the transit" (daily candidate rotation, keyed by calendar date) live —
    // that screen has its own dev-only "+1 DAY" control since it has no
    // in-scene timer to skip, unlike the rocket ETA. See the "Transit" vs
    // "transit-photometry" naming note in TransitScreen.tsx and the ZenNotes
    // decision doc for why these are two unrelated screens sharing a word.
    shots: [
      { key: 'telescope-hub',      label: 'Hub',      hint: 'Post-onboarding, Free Ops unlocked, telescope built, story mission on the board', stage: 'free-ops' },
      { key: 'telescope-fab',      label: 'Fab',      hint: 'Space telescope mission accepted, at fab — post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'telescope-transit',  label: 'Transit',  hint: 'Rocket physically en route to Earth orbit to deploy the telescope — dev "Skip ▸" button fast-forwards this. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'telescope-debrief',  label: 'Debrief',  hint: 'Telescope deployed, satellite launched — post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-tess-discovery',  label: 'Console',  hint: 'Satellite already in orbit — point it (star map) and review the daily transit-photometry candidate. Stationary, no travel. Use the on-screen dev "+1 DAY" control to preview future days without waiting. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
    ],
  },
  {
    label: 'Recent UI',
    color: '#9b8cf0',
    shots: [
      { key: 'ui-free-ops-fab', label: 'Free Ops launch', hint: 'Free Ops with no mission opens the launch route and lands on the Mission Board', stage: 'free-ops' },
      { key: 'ui-mission-board', label: 'Mission Board', hint: 'Recent OD layout restyle with client cards — Free Ops unlocked, tutorial off', stage: 'free-ops' },
      { key: 'ui-build', label: 'Build', hint: 'Free Ops construction state with a silo, mining settlement, and refinery materials', stage: 'free-ops' },
      { key: 'ui-target-picker', label: 'Launch Review', hint: 'Launch review (the target picker is folded in) with the Transport mission loaded — missionsDone: 1, Free Ops NOT unlocked', stage: 'tutorial' },
      { key: 'ui-rover-survey', label: 'Rover Survey', hint: 'Starter-rover live TakeOn field — survey before ship-laser extraction', stage: 'tutorial' },
      { key: 'ship-customizer', label: 'Ship Customiser', hint: 'Unlocked hangar interior view with Explorer room slots — missionsDone: 1, Free Ops NOT unlocked', stage: 'tutorial' },
      { key: 'ui-hangar-assembly', label: 'Hangar Assembly', hint: 'Prospector shipment fitting in the hangar before launchpad transfer — missionsDone: 1', stage: 'tutorial' },
      { key: 'ui-research-calendar-empty', label: 'Research calendar, empty', hint: 'Control Station with no stamps yet', stage: 'free-ops' },
      { key: 'ui-research-calendar-month-half', label: 'Research calendar, half month', hint: 'Control Station with stamps on most days so far this month', stage: 'free-ops' },
      { key: 'ui-instrument-hub', label: 'Control Station', hint: 'One hub for telescopes and satellites. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-saturn-storm-search', label: 'Saturn Storm Search', hint: 'Saturn satellite launched — Cassini frame classify screen. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-asteroid-discovery', label: 'Asteroid Discovery', hint: 'Space Telescope built (STS-622) — live NEOCP candidate review, requires seeded asteroid_candidates on the shared backend. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-refinery', label: 'Refinery', hint: 'Refinery built with ore in stash and one batch queued. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-orionids-rover', label: 'Orionids: rover survey', hint: 'Orionids surface observation on Eros with the field rover', stage: 'free-ops' },
      { key: 'ui-orionids-events-stage1', label: 'Orionids: rover step', hint: 'Mission board at event stage 1: Events tab offers the Orionids surface observation with the rover', stage: 'free-ops' },
      { key: 'ui-orionids-ready', label: 'Orionids: ready', hint: 'Field guide complete, Orionids event focused, ready to choose the shower mission', stage: 'free-ops' },
      { key: 'ui-orionids-shower-mining-fresh', label: 'Shower run: mining, fresh', hint: 'Orionids shower run on Eros at 0 of 20. Fragments fall and collect on landing. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-orionids-shower-mining', label: 'Shower run: mining', hint: 'Orionids shower run on Eros with the order filled (20 caught since accept, 25 in the ledger). Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-orionids-shower-debrief', label: 'Shower run: debrief', hint: 'Filled shower run back home: run payout card, fragments kept, haul to sell. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-market', label: 'Market', hint: 'Marketplace panel with the Exchange and a silo built and a stocked stash. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-mission-log', label: 'Mission Log', hint: 'Mission Log tray over Base. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-ledger', label: 'Ledger', hint: 'Narrative ledger. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-community-research', label: 'Community research', hint: 'Community research page: stamp calendar, community bar and the live Orionids week. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'constellation-hub', label: 'Constellation Base', hint: 'Base after a completed mission, with the authored sky constellations visible', stage: 'free-ops' },
      { key: 'ui-launchpad', label: 'Launchpad', hint: 'Launchpad with the contract board. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
    ],
  },
  {
    label: 'Gaps and checkpoints',
    color: '#91ccef',
    shots: [
      { key: 'ui-landing', label: 'Landing', hint: 'Touchdown scene on arrival at Eros, mid-mission', stage: 'tutorial' },
      { key: 'ui-rocket-buy', label: 'Rocket buy', hint: 'Rocket purchase list, post-onboarding with funds', stage: 'free-ops' },
      { key: 'ui-hangar-surveyor', label: 'Hangar: Surveyor', hint: 'Six missions done and funds in hand, so the tier 3 Surveyor is open in the hangar', stage: 'free-ops' },
      { key: 'ui-subsurface', label: 'Subsurface', hint: 'Base subsurface view with a silo and stash', stage: 'free-ops' },
      { key: 'cp-early', label: 'Checkpoint: early', hint: 'About 15 min in: 3 missions done, Free Ops unlocked, tier 2 parts', stage: 'free-ops' },
      { key: 'cp-mid', label: 'Checkpoint: mid', hint: 'About 35 min in: 8 missions done, silo and refinery built, tier 2 rocket', stage: 'free-ops' },
      { key: 'cp-late', label: 'Checkpoint: late', hint: 'About 55 min in: 20 missions done, tier 3 rocket, all buildings, rich stash', stage: 'free-ops' },
    ],
  },
]

/** Campaign-free starting points for the Scene Studio's sandbox: the `sandbox-*` cases of `fixture()` below. */
export const SANDBOX_FIXTURES = ['sandbox-hub', 'sandbox-transit'] as const

/**
 * A stage fixture by name. `sandbox:<fixture>[:<setup>]` is the same fixture with its campaign context removed and a
 * scene script's setup layered on (lib/sandbox.ts). The `sandbox-*` fixtures below are the campaign-free starting
 * points those scenes use: the shape a screen needs and nothing more.
 */
export function resolvePreset(name: string): Partial<GameState> | null {
  if (isSandboxName(name)) return resolveSandbox(name, fixture)
  return fixture(name)
}

function instrumentHubFixture(researchStamps?: Player['researchStamps']): Partial<GameState> {
  return {
    screen: 'instrument-hub',
    player: {
      ...ASTEROID_DISCOVERY_PLAYER,
      transitSatelliteLaunchedAt: Date.now() - 86_400_000,
      transitSatelliteLevel: 1,
      deepSpaceTelescopeBuilt: true,
      saturnImagerLaunchedAt: Date.now() - 86_400_000,
      ...(researchStamps ? { researchStamps } : {}),
    },
    tutorial: false,
    doneSteps: TRAINING_DONE,
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    lastCargo: null,
    popup: null,
  }
}

function fixture(name: string): Partial<GameState> | null {
  switch (name) {
    // ── Sandbox starting points (SSL-641): no campaign, nothing built, nothing owed ──
    case 'sandbox-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 3, placed: [], placementPlots: {}, freeOperations: true },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'sandbox-transit': {
      // Outbound to Eros, an hour long, 20 minutes in. The scene's things move the destination, the ship and the progress.
      const transitStartedAt = Date.now() - 20 * 60_000
      return {
        screen: 'transit',
        player: {
          ...BASE_PLAYER, missionsDone: 3, freeOperations: true,
          activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, missionPhase: 'transit',
          transitStartedAt, arrivalAt: transitStartedAt + 60 * 60_000,
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }
    }

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

    case 'constellation-hub':
      return {
        screen: 'hub',
        player: {
          ...BASE_PLAYER,
          missionsDone: 1,
          completedMissions: [{ id: FIRST_MISSION.id, title: FIRST_MISSION.title, targetId: 'eros', completedAt: 42, runId: 'constellation-fixture', kind: 'client' }],
        },
        tutorial: false, doneSteps: TRAINING_DONE,
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

    case 'm1-return':
      return {
        screen: 'transit',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, returningToEarth: true, debriefPending: true, missionPhase: 'transit', transitStartedAt: Date.now(), arrivalAt: null },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: { ...FIRST_MISSION.requires.minerals, [FIRST_MINERAL]: (FIRST_MISSION.requires.minerals[FIRST_MINERAL] ?? 1) + 3, nickel: 2 }, popup: null,
      }

    case 'm1-home': {
      const haul = { ...FIRST_MISSION.requires.minerals, [FIRST_MINERAL]: (FIRST_MISSION.requires.minerals[FIRST_MINERAL] ?? 1) + 3, nickel: 2 }
      return {
        screen: 'debrief',
        player: {
          ...BASE_PLAYER, missionsDone: 0, stash: { ...haul, cobalt: 3 },
          placed: [...(BASE_PLAYER.placed ?? []), 'surface-silo'],
          activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, missionPhase: 'debrief', homeDeliveryPending: true,
        },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: haul, popup: null,
      }
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

    // ── Transport (guided mission 2: two-leg "mine then deliver" client pick) ──
    case 'transport-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: EXTRACTION_DONE,
        missionId: null, targetId: null, deliveryTargetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'transport-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 1, francs: BASE_PLAYER.francs - ROCKET_PRICES.prospector },
        tutorial: true, doneSteps: { ...EXTRACTION_DONE, 30: true, 31: true },
        missionId: TRANSPORT_MISSION.id, targetId: TRANSPORT_MISSION.targetId ?? 'bennu', deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'transport-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 1, activeMission: { id: TRANSPORT_MISSION.id, label: `${TRANSPORT_MISSION.title} → ${TRANSPORT_MISSION.targetId}` } },
        tutorial: true, doneSteps: { ...EXTRACTION_DONE, 30: true, 31: true, 32: true },
        missionId: TRANSPORT_MISSION.id, targetId: TRANSPORT_MISSION.targetId ?? 'bennu', deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'transport-delivery':
      return {
        screen: 'delivery',
        player: { ...BASE_PLAYER, missionsDone: 1, activeMission: { id: TRANSPORT_MISSION.id, label: `${TRANSPORT_MISSION.title} → ${TRANSPORT_MISSION.targetId}` } },
        tutorial: true, doneSteps: { ...EXTRACTION_DONE, 30: true, 31: true, 32: true },
        missionId: TRANSPORT_MISSION.id, targetId: TRANSPORT_MISSION.targetId ?? 'bennu', deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: { ...(TRANSPORT_MISSION.requires?.minerals ?? {}), ice: 3 }, popup: null,
      }

    case 'transport-debrief':
      return {
        screen: 'debrief',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: { ...EXTRACTION_DONE, 30: true, 31: true, 32: true },
        missionId: TRANSPORT_MISSION.id, targetId: TRANSPORT_MISSION.targetId ?? 'bennu', deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: TRANSPORT_MISSION.requires.minerals, popup: null,
      }

    // ── Storage Silo (last training step; placing it opens Free Ops) ──
    case 'storage-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 2 },
        tutorial: true, doneSteps: TRANSPORT_DONE,
        missionId: null, targetId: null, deliveryTargetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'storage-build':
      return {
        screen: 'build',
        player: { ...BASE_PLAYER, missionsDone: 2 },
        tutorial: true, doneSteps: { ...TRANSPORT_DONE, 40: true },
        missionId: null, targetId: null, deliveryTargetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    // ── First Satellite Launch (post-onboarding story mission) ──
    case 'telescope-hub':
      return {
        screen: 'hub',
        player: POST_ONBOARDING_PLAYER,
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'telescope-fab':
      return {
        screen: 'fab',
        player: POST_ONBOARDING_PLAYER,
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: TRANSIT_TELESCOPE_MISSION_ID, targetId: TRANSIT_TELESCOPE_TARGET_ID,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'telescope-transit':
      {
        const transitStartedAt = Date.now() - 30_000
      return {
        screen: 'transit',
        player: { ...POST_ONBOARDING_PLAYER, activeMission: { id: TRANSIT_TELESCOPE_MISSION_ID, label: 'Launch Space Telescope → Earth Orbit' }, transitStartedAt, arrivalAt: transitStartedAt + 90_000 },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: TRANSIT_TELESCOPE_MISSION_ID, targetId: TRANSIT_TELESCOPE_TARGET_ID,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }
      }

    case 'telescope-debrief':
      return {
        screen: 'debrief',
        player: { ...POST_ONBOARDING_PLAYER, transitSatelliteLaunchedAt: Date.now(), transitSatelliteLevel: 1 },
        tutorial: false, doneSteps: TRAINING_DONE,
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
        },
        tutorial: false,
        doneSteps: EXTRACTION_DONE,
        missionId: TRANSPORT_MISSION.id,
        targetId: TRANSPORT_MISSION.targetId ?? 'bennu',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-hangar-assembly':
      return {
        screen: 'hangar',
        player: {
          ...BASE_PLAYER,
          missionsDone: 1,
          pendingLaunch: true,
        },
        tutorial: false,
        doneSteps: EXTRACTION_DONE,
        missionId: TRANSPORT_MISSION.id,
        targetId: TRANSPORT_MISSION.targetId,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    // ── Recently overhauled UI surfaces ──
    case 'ui-free-ops-fab':
      // Free Ops opens the launch route with no mission picked; it must hand over to the Mission Board.
      return { ...fixture('ui-mission-board'), screen: 'fab' }
    case 'ui-orionids-events-stage1':
      // Shower run done (event stage 1): the Events board offers the rover surface observation.
      { const board = fixture('ui-mission-board')!
      return { ...board, player: { ...board.player!, orionidsEventStage: 1, orionidsFragments: { caught: 25, redeemed: 0 }, badges: { 'orionids-2026': { eventId: 'orionids-2026', tier: 'gold', earnedAt: Date.UTC(2026, 9, 23) } } } } }
    case 'ui-orionids-ready':
      return {
        screen: 'missions',
        player: {
          ...POST_ONBOARDING_PLAYER,
          fireballSpotter: { readAt: 1, passedAt: 1 },
          orionidsEventStage: 0,
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }
    case 'ui-mission-board':
      return {
        screen: 'missions',
        player: {
          ...BASE_PLAYER,
          missionsDone: 2,
          placed: ['launchpad', 'surface-silo'],
          placementPlots: { launchpad: 0, 'surface-silo': 1 },
          freeOperations: true,
          clientMissions: { 'helios-propulsion-depot': 2, 'lumen-research': 1 },
          lastClient: 'helios-propulsion-depot',
        },
        tutorial: false,
        doneSteps: TRANSPORT_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-build':
      return {
        screen: 'build',
        player: {
          ...POST_ONBOARDING_PLAYER,
          francs: 1_000_000_000,
          placed: ['launchpad', 'surface-silo'],
          placementPlots: { launchpad: 0, 'surface-silo': 2 },
          stash: { aluminium: 20, copper: 10 },
        },
        tutorial: false,
        doneSteps: TRANSPORT_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-target-picker':
      return {
        screen: 'targets',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: false,
        doneSteps: EXTRACTION_DONE,
        missionId: TRANSPORT_MISSION.id,
        targetId: TRANSPORT_MISSION.targetId ?? 'bennu',
        deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-tess-discovery':
      return {
        screen: 'galaxy',
        visualFixture: 'tess',
        player: {
          ...POST_ONBOARDING_PLAYER,
          transitSatelliteLaunchedAt: Date.now() - 86_400_000,
          transitSatelliteLevel: 1,
          researchAnnotations: 3,
          researchXP: 180,
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-rover-survey':
      return {
        screen: 'rover-survey',
        player: {
          ...BASE_PLAYER,
          missionsDone: 1,
          activeMission: { id: TRANSPORT_MISSION.id, label: `${TRANSPORT_MISSION.title} → ${TRANSPORT_MISSION.targetId ?? 'bennu'}` },
        },
        tutorial: false,
        doneSteps: EXTRACTION_DONE,
        missionId: TRANSPORT_MISSION.id,
        targetId: TRANSPORT_MISSION.targetId ?? 'bennu',
        deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-orionids-rover':
      // The event's second step: the surface observation on Eros with the Orionids field rover.
      return {
        screen: 'rover-survey',
        player: {
          ...BASE_PLAYER,
          missionsDone: 6,
          freeOperations: true,
          orionidsEventStage: 1,
          missionPhase: 'survey',
          activeMission: { id: ORIONIDS_SURFACE_RESEARCH_MISSION_ID, label: 'Orionids surface observation' },
        },
        tutorial: false,
        doneSteps: EXTRACTION_DONE,
        missionId: ORIONIDS_SURFACE_RESEARCH_MISSION_ID,
        targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-research-calendar-empty':
      return instrumentHubFixture({})

    case 'ui-research-calendar-month-half': {
      // Most days of this UTC month up to today, with a second kind on some, so streak, gaps and the dot all show.
      const today = new Date()
      const stamps: NonNullable<Player['researchStamps']> = {}
      for (let day = 1; day <= today.getUTCDate(); day += 1) {
        if (day % 3 === 0) continue
        const key = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day)).toISOString().slice(0, 10)
        stamps[key] = day % 4 === 0 ? ['classification', 'event'] : ['survey']
      }
      return instrumentHubFixture(stamps)
    }

    case 'ui-instrument-hub':
      return instrumentHubFixture()

    case 'ui-saturn-storm-search':
      return {
        screen: 'saturn-storm-search',
        player: {
          ...ASTEROID_DISCOVERY_PLAYER,
          transitSatelliteLaunchedAt: Date.now() - 86_400_000,
          transitSatelliteLevel: 1,
          deepSpaceTelescopeBuilt: true,
          saturnImagerLaunchedAt: Date.now() - 86_400_000,
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-asteroid-discovery':
      return {
        screen: 'asteroid-discovery',
        visualFixture: 'asteroid',
        player: ASTEROID_DISCOVERY_PLAYER,
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-refinery':
      return {
        screen: 'refinery',
        player: { ...POST_ONBOARDING_PLAYER, refineryBuilt: true, refineryUnlocked: true, stash: { iron: 40, nickel: 20 }, },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    // SSL-651: the Orionids shower run with its order filled. 25 caught in all, 5 before this run was accepted.
    case 'ui-orionids-shower-mining':
    case 'ui-orionids-shower-mining-fresh':
    case 'ui-orionids-shower-debrief': {
      const home = name === 'ui-orionids-shower-debrief'
      const haul = { orionid_debris: 19, iron: 2 }
      return {
        screen: home ? 'debrief' : 'mining',
        player: {
          ...POST_ONBOARDING_PLAYER,
          activeMission: { id: ORIONIDS_NIGHT_RUN_ID, label: 'Orionids shower run' },
          missionPhase: home ? 'debrief' : 'mining',
          orionidsFragments: { caught: name === 'ui-orionids-shower-mining-fresh' ? 5 : 25, redeemed: 0 },
          orionidsRunBaseline: 5,
          stash: home ? haul : {},
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: ORIONIDS_NIGHT_RUN_ID,
        targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: home ? haul : null,
        popup: null,
      }
    }

    case 'ui-market':
      return {
        screen: 'market',
        player: { ...POST_ONBOARDING_PLAYER, placed: [...POST_ONBOARDING_PLAYER.placed, 'market', 'surface-silo'], stash: { iron: 20, nickel: 10, silicates: 5 }, },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-mission-log':
      return {
        screen: 'mission-history',
        player: { ...POST_ONBOARDING_PLAYER, },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-ledger':
      return {
        screen: 'narrative-ledger',
        player: { ...POST_ONBOARDING_PLAYER, },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-community-research':
      return {
        screen: 'community-research',
        player: {
          ...POST_ONBOARDING_PLAYER,
          // Existing-save acceptance fixture: the Orionids run has already
          // stamped today's event contribution for the community history view.
          researchStamps: { [new Date().toISOString().slice(0, 10)]: ['event'] },
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-launchpad':
      return {
        screen: 'launchpad',
        player: { ...POST_ONBOARDING_PLAYER, },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-landing':
      return {
        screen: 'landing',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, missionPhase: 'landing', landingStartedAt: Date.now() },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'ui-hangar-surveyor':
      return {
        screen: 'hangar',
        player: { ...POST_ONBOARDING_PLAYER, missionsDone: 6, francs: 1_000_000_000 },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'ui-rocket-buy':
      return {
        screen: 'rocket-buy',
        player: { ...POST_ONBOARDING_PLAYER, francs: 1_000_000_000 },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'ui-subsurface':
      return {
        screen: 'hub-subsurface',
        player: {
          ...POST_ONBOARDING_PLAYER,
          placed: ['launchpad', 'surface-silo'],
          placementPlots: { launchpad: 0, 'surface-silo': 1 },
          stash: { iron: 30, nickel: 12, silicates: 8 },
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    // Progress checkpoints: jump to roughly minute 15 / 35 / 55 of the playable hour without playing it.
    case 'cp-early':
      return {
        screen: 'hub',
        player: { ...POST_ONBOARDING_PLAYER, francs: 40_000_000, stash: { iron: 10 } },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'cp-mid':
      return {
        screen: 'hub',
        player: {
          ...POST_ONBOARDING_PLAYER,
          clientMissions: { 'helios-propulsion-depot': 10, 'arcturus-battery-systems': 10 },
          missionsDone: 8, francs: 120_000_000,
          placed: ['launchpad', 'transit-telescope', 'surface-silo'],
          placementPlots: { launchpad: 0, 'transit-telescope': 1, 'surface-silo': 2 },
          refineryBuilt: true, refineryUnlocked: true,
          stash: { iron: 40, nickel: 20, silicates: 15, copper: 8 },
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'cp-late':
      return {
        screen: 'hub',
        player: {
          ...ASTEROID_DISCOVERY_PLAYER,
          missionsDone: 20, francs: 600_000_000,
          placed: ['launchpad', 'transit-telescope', 'deep-space-telescope', 'surface-silo', 'market'],
          placementPlots: { launchpad: 0, 'transit-telescope': 1, 'deep-space-telescope': 2, 'surface-silo': 3, market: 4 },
          refineryBuilt: true, refineryUnlocked: true, launchpadUpgraded: true,
          clientMissions: { 'helios-propulsion-depot': 14, 'arcturus-battery-systems': 12 },
          stash: { iron: 120, nickel: 60, silicates: 40, copper: 30, gold: 6 },
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk3', propulsion: 'ion-a3', drill: 'plasma-t3' },
        lastCargo: null, popup: null,
      }

    default:
      return null
  }
}
