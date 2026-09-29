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

import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'

/** The structure whose placement completes the Storage stage. Kept here (not
 *  imported from EconomySystem) so EconomySystem can depend on this module. */
const STORAGE_SILO_KIND = 'surface-silo'

export type AgencyTrainingStage = 'launchpad' | 'extraction' | 'transport' | 'storage' | 'free-ops'

export const AGENCY_TRAINING_STAGES: readonly AgencyTrainingStage[] = ['launchpad', 'extraction', 'transport', 'storage', 'free-ops']

const AGENCY_TRAINING_LABELS: Record<AgencyTrainingStage, string> = {
  launchpad: 'Place Launchpad',
  extraction: 'Extraction',
  transport: 'Transport',
  storage: 'Build Storage Silo',
  'free-ops': 'Free Ops',
}

/** Missions completed before the Transport lesson (the two-stop mine-and-haul
 *  job, KES-313) starts: Extraction is the single mission before it. */
export const TRANSPORT_LESSON_MISSIONS_DONE = FREE_OPS_START_MISSIONS_DONE - 1

/** Missions that put a player in Free Ops under the pre-SSL-332 onboarding
 *  (M1, M2 Prospector, M3). Those saves keep Free Ops without a silo. */
export const LEGACY_FREE_OPS_MISSIONS_DONE = 3

export interface AgencyTrainingPlayer {
  placed?: string[]
  missionsDone: number
}

function finiteMissionsDone(player: AgencyTrainingPlayer): number {
  return Number.isFinite(player.missionsDone) ? player.missionsDone : 0
}

/** The Free Ops boundary: guided missions flown and a storage silo placed,
 *  or a save that already reached Free Ops under the old onboarding. */
export function freeOperationsUnlocked(player: AgencyTrainingPlayer): boolean {
  const missionsDone = finiteMissionsDone(player)
  if (missionsDone >= LEGACY_FREE_OPS_MISSIONS_DONE) return true
  return missionsDone >= FREE_OPS_START_MISSIONS_DONE && (player.placed ?? []).includes(STORAGE_SILO_KIND)
}

/** True while the player has flown both guided missions but has not yet
 *  placed the storage silo that opens Free Ops. */
export function awaitingStorageSilo(player: AgencyTrainingPlayer): boolean {
  return finiteMissionsDone(player) >= FREE_OPS_START_MISSIONS_DONE && !freeOperationsUnlocked(player)
}

/** The training stage the player is currently on (the first incomplete one). */
export function agencyTrainingStage(player: AgencyTrainingPlayer): AgencyTrainingStage {
  if (freeOperationsUnlocked(player)) return 'free-ops'
  const missionsDone = finiteMissionsDone(player)
  // Mission progress wins over a missing launchpad: an older save that
  // somehow lost its pad record has still demonstrably flown missions.
  if (missionsDone < 1 && !(player.placed ?? []).includes('launchpad')) return 'launchpad'
  if (missionsDone < TRANSPORT_LESSON_MISSIONS_DONE) return 'extraction'
  if (missionsDone < FREE_OPS_START_MISSIONS_DONE) return 'transport'
  return 'storage'
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

export type FreeOpsActivityId = 'client-work' | 'space-telescope' | 'build-refinery'

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
      cta: telescopeUp ? 'Open instrument hub' : 'Open launchpad',
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
  ]
}
