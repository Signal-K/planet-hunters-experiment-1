// SSL-332 — Onboarding v2: "establish your space agency".
//
// Onboarding is taught as founding an agency, not as three numbered mining
// missions. The training track is:
//
//   Place Launchpad → Extraction → Transport → Build Storage Silo → Free Ops
//
// and Free Ops opens on three agency activities: client work, the space
// telescope, and building a refinery.
//
// Free Ops starts once both guided missions are flown AND a storage silo is
// placed (freeOperationsUnlocked). Players who reached Free Ops under the old
// three-mission onboarding keep it without a silo, so nobody loses an unlock.

import { isTrainingComplete, type FlightPlanProgress, type TrainingTryId } from './FlightPlanSystem'

/** The structure whose placement completes the Storage stage. Kept here (not
 *  imported from EconomySystem) so EconomySystem can depend on this module. */
export type AgencyTrainingStage = TrainingTryId | 'launchpad' | 'extraction' | 'transport' | 'storage' | 'free-ops'

export const AGENCY_TRAINING_STAGES: readonly AgencyTrainingStage[] = ['mining', 'scan', 'part', 'free-ops']

const AGENCY_TRAINING_LABELS: Record<AgencyTrainingStage, string> = {
  mining: 'Mining try',
  scan: 'Planet scan try',
  part: 'Part tweak try',
  launchpad: 'Place Launchpad',
  extraction: 'Extraction',
  transport: 'Transport',
  storage: 'Build Storage Silo',
  'free-ops': 'Free Ops',
}

/** Missions completed before the Transport lesson (the two-stop mine-and-haul
 *  job, KES-313) starts: Extraction is the single mission before it. */
export const TRANSPORT_LESSON_MISSIONS_DONE = 1

/** Missions that put a player in Free Ops under the pre-SSL-332 onboarding
 *  (M1, M2 Prospector, M3). Those saves keep Free Ops without a silo. */
export const LEGACY_FREE_OPS_MISSIONS_DONE = 3

export interface AgencyTrainingPlayer {
  placed?: string[]
  missionsDone: number
  flightPlan?: FlightPlanProgress
}

function finiteMissionsDone(player: AgencyTrainingPlayer): number {
  return Number.isFinite(player.missionsDone) ? player.missionsDone : 0
}

/** The Free Ops boundary: guided missions flown and a storage silo placed,
 *  or a save that already reached Free Ops under the old onboarding. */
export function freeOperationsUnlocked(player: AgencyTrainingPlayer): boolean {
  const missionsDone = finiteMissionsDone(player)
  if (missionsDone >= LEGACY_FREE_OPS_MISSIONS_DONE) return true
  return isTrainingComplete(player.flightPlan)
}

/** True while the player has flown both guided missions but has not yet
 *  placed the storage silo that opens Free Ops. */
export function awaitingStorageSilo(player: AgencyTrainingPlayer): boolean {
  return false
}

/** The training stage the player is currently on (the first incomplete one). */
export function agencyTrainingStage(player: AgencyTrainingPlayer): AgencyTrainingStage {
  if (freeOperationsUnlocked(player)) return 'free-ops'
  if (!player.flightPlan?.completed?.mining) return 'mining'
  if (!player.flightPlan?.completed?.scan) return 'scan'
  return 'part'
}

export interface AgencyTrainingStep {
  stage: AgencyTrainingStage
  label: string
  status: 'done' | 'current' | 'upcoming'
}

/** The whole track with per-stage status, for a progress rail. */
export function agencyTrainingTrack(player: AgencyTrainingPlayer): AgencyTrainingStep[] {
  const currentIndex = AGENCY_TRAINING_STAGES.indexOf(agencyTrainingStage(player))
  return AGENCY_TRAINING_STAGES.map((stage, index) => ({
    stage,
    label: AGENCY_TRAINING_LABELS[stage],
    status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

/** `popup` value that reopens the training track and Free Ops activities
 *  from the menu (the replayable review of training). */
export const AGENCY_TRAINING_POPUP = 'agency-training'

export type FreeOpsActivityId = 'client-work' | 'space-telescope' | 'build-refinery' | 'transport' | 'storage-silo'

export interface FreeOpsActivity {
  id: FreeOpsActivityId
  label: string
  body: string
  cta: string
  /** Where the activity opens. The telescope starts at the Launchpad (where
   *  its launch lives) until one is in orbit; the refinery starts at
   *  placement until one is built. */
  screen: 'missions' | 'launchpad' | 'instrument-hub' | 'build' | 'refinery'
}

export interface FreeOpsActivityPlayer {
  refineryBuilt?: boolean
  transitSatelliteLaunchedAt?: number | null
}

/** The three activities Free Ops offers immediately, in display order. */
export function freeOpsActivities(player: FreeOpsActivityPlayer): FreeOpsActivity[] {
  const telescopeUp = !!player.transitSatelliteLaunchedAt
  return [
    {
      id: 'client-work',
      label: 'Client work',
      body: 'Take a paid contract: mine a client’s order and deliver it.',
      cta: 'Open contracts',
      screen: 'missions',
    },
    {
      id: 'space-telescope',
      label: 'Space telescope',
      body: telescopeUp
        ? 'Review new observations from your telescope in orbit.'
        : 'Launch a transit telescope and classify real observation data.',
      cta: telescopeUp ? 'Open control station' : 'Open launchpad',
      screen: telescopeUp ? 'instrument-hub' : 'launchpad',
    },
    {
      id: 'build-refinery',
      label: player.refineryBuilt ? 'Refinery' : 'Build refinery',
      body: player.refineryBuilt
        ? 'Turn ore from your silo into higher-value goods.'
        : 'Construct a refinery at your base to turn stored ore into higher-value goods.',
      cta: player.refineryBuilt ? 'Open refinery' : 'Open build',
      screen: player.refineryBuilt ? 'refinery' : 'build',
    },
    {
      id: 'transport',
      label: 'Transport work',
      body: 'Take a two-stop client haul when your program needs a change of pace.',
      cta: 'Open contracts',
      screen: 'missions',
    },
    {
      id: 'storage-silo',
      label: 'Storage Silo',
      body: 'Build Earth-side storage before expanding your material operations.',
      cta: 'Open build',
      screen: 'build',
    },
  ]
}
