import type { Mission } from '@/lib/data/types'
import type { ProgramStep } from '@/lib/mission-board-view'
import { probeTargetForMission } from '@/lib/probes/survey-probe'
import { SATURN_IMAGER_MISSION_ID, TRANSIT_TELESCOPE_MISSION_ID } from '@/lib/runtimeCatalog'

/** Associate existing agency flights with the body they actually fly to. */
export function agencyStepLocation(step: ProgramStep, missions: readonly Mission[]): string | null {
  const target = missions.find(mission => mission.id === step.id)?.targetId ?? probeTargetForMission(step.id)
  // These are deployment lanes around Earth, including the Saturn imager:
  // its data comes from Saturn, but its spacecraft is deployed in Earth orbit.
  if (target?.startsWith('earth-orbit-')) return 'earth'
  if (target) return target
  if (step.id === TRANSIT_TELESCOPE_MISSION_ID || step.id === SATURN_IMAGER_MISSION_ID) return 'earth'
  return null
}
