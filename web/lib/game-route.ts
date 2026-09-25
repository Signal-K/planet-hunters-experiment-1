import type { GameState, Screen } from '@/lib/game-types'

type RouteState = Pick<GameState, 'screen' | 'missionId' | 'targetId'>

const MISSION_SETUP_INTERNAL_SCREENS = new Set<Screen>([
  'missions',
  'targets',
  'rocket-buy',
  'fab',
])

export function isMissionSetupInternalScreen(screen: Screen): boolean {
  return MISSION_SETUP_INTERNAL_SCREENS.has(screen)
}

/** Mission creation is one routed scene. Target, vehicle, and preflight are
 * internal steps and must not cause a Next navigation. A bare Free Ops build
 * screen still owns /game/fab because it is not part of a mission setup run. */
export function canonicalGameRoute({ screen, missionId, targetId }: RouteState): Screen {
  if (screen === 'targets' || screen === 'rocket-buy') return 'missions'
  if (screen === 'fab' && missionId && targetId) return 'missions'
  return screen
}

export function canonicalGamePath(state: RouteState): string {
  return `/game/${canonicalGameRoute(state)}`
}

/**
 * Whether the state→URL sync must push `nextPath`. `window.location` only
 * changes once a push commits, so while an earlier push is still in flight
 * it can already equal the newer screen's path; comparing against it alone
 * would drop the newer screen, and the late commit would then sync the older
 * one back into state (a Resume tapped right after Back reopened the Hub).
 */
export function shouldPushGamePath(nextPath: string, locationPath: string, lastPushedPath: string | null): boolean {
  if (locationPath !== nextPath) return true
  const pushInFlight = lastPushedPath !== null && lastPushedPath !== locationPath
  return pushInFlight && lastPushedPath !== nextPath
}
