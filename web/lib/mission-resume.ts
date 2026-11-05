import type { Player, Screen } from './game-types'

/** Skip a stale transit frame when the saved arrival time has already passed. */
export function missionResumeScreen(
  player: Pick<Player, 'missionPhase' | 'arrivalAt' | 'returningToEarth' | 'headingToDelivery'>,
  now = Date.now(),
): Screen {
  const phase = player.missionPhase ?? 'transit'
  // A run saved mid-survey (the rover survey was removed) resumes on the mining surface.
  if ((phase as string) === 'survey') return 'mining'
  if (phase !== 'transit' || player.arrivalAt == null || player.arrivalAt > now) return phase
  if (player.returningToEarth) return 'debrief'
  if (player.headingToDelivery) return 'delivery'
  return 'landing'
}
