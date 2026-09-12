import type { Player, Screen } from './game-types'

/** Skip a stale transit frame when the saved arrival time has already passed. */
export function missionResumeScreen(
  player: Pick<Player, 'missionPhase' | 'arrivalAt' | 'returningToEarth' | 'headingToDelivery'>,
  now = Date.now(),
): Screen {
  const phase = player.missionPhase ?? 'transit'
  if (phase !== 'transit' || player.arrivalAt == null || player.arrivalAt > now) return phase
  if (player.returningToEarth) return 'debrief'
  if (player.headingToDelivery) return 'delivery'
  return 'landing'
}
