import type { MissionPhase, Player, Screen } from './game-types'

/** The router screen that plays a mission phase. The `transit` phase is shown on the `flight` screen. */
export function missionPhaseScreen(phase: MissionPhase | undefined): Screen {
  return !phase || phase === 'transit' ? 'flight' : phase
}

/** Skip a stale transit frame when the saved arrival time has already passed. */
export function missionResumeScreen(
  player: Pick<Player, 'missionPhase' | 'arrivalAt' | 'returningToEarth' | 'headingToDelivery'>,
  now = Date.now(),
): Screen {
  const phase = player.missionPhase ?? 'transit'
  // A run saved mid-survey (the rover survey was removed) resumes on the mining surface.
  if ((phase as string) === 'survey') return 'mining'
  if (phase !== 'transit' || player.arrivalAt == null || player.arrivalAt > now) return missionPhaseScreen(phase)
  if (player.returningToEarth) return 'debrief'
  if (player.headingToDelivery) return 'delivery'
  return 'landing'
}
