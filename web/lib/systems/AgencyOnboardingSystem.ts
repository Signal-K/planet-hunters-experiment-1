// SSL-332 — Onboarding v2: "establish your space agency".
//
// Onboarding is taught as founding an agency, not as three numbered mining
// missions. The training track is:
//
//   Place Launchpad → Extraction → Transport → Build Storage Silo → Free Ops
//
// and Free Ops opens on three agency activities: client work, the space
// telescope, and building a refinery (a later SSL-332 slice).
//
// This module is the pure stage model only. It derives where a player sits on
// that track from state that already exists, and it deliberately gates
// nothing: `player.freeOperations` stays the progression boundary (derived
// from missionsDone in game-state.ts), so existing players keep every unlock.
// The Storage Silo stage is therefore reported as the next training beat for a
// Free Ops player who has not built one, never as a lock.

import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import { earthStorageBuilt } from './EconomySystem'

export type AgencyTrainingStage = 'launchpad' | 'extraction' | 'transport' | 'storage' | 'free-ops'

export const AGENCY_TRAINING_STAGES: readonly AgencyTrainingStage[] = ['launchpad', 'extraction', 'transport', 'storage', 'free-ops']

const AGENCY_TRAINING_LABELS: Record<AgencyTrainingStage, string> = {
  launchpad: 'Place Launchpad',
  extraction: 'Extraction',
  transport: 'Transport',
  storage: 'Build Storage Silo',
  'free-ops': 'Free Ops',
}

/** Missions completed before the transport lesson starts. Today's onboarding
 *  sequence is M1/M2 (mine and return) then M3, the two-stop mine-and-haul job
 *  (KES-313), so extraction covers every onboarding mission before the last. */
export const TRANSPORT_LESSON_MISSIONS_DONE = FREE_OPS_START_MISSIONS_DONE - 1

export interface AgencyTrainingPlayer {
  placed?: string[]
  subsurfaceBuilt?: string[]
  missionsDone: number
}

/** The training stage the player is currently on (the first incomplete one). */
export function agencyTrainingStage(player: AgencyTrainingPlayer): AgencyTrainingStage {
  const missionsDone = Number.isFinite(player.missionsDone) ? player.missionsDone : 0
  // Mission progress wins over a missing launchpad: an older save that
  // somehow lost its pad record has still demonstrably flown missions.
  if (missionsDone < 1 && !(player.placed ?? []).includes('launchpad')) return 'launchpad'
  if (missionsDone < TRANSPORT_LESSON_MISSIONS_DONE) return 'extraction'
  if (missionsDone < FREE_OPS_START_MISSIONS_DONE) return 'transport'
  if (!earthStorageBuilt(player)) return 'storage'
  return 'free-ops'
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
