import type { GameState, Screen } from '@/lib/game-types'

type RouteState = Pick<GameState, 'screen' | 'missionId' | 'targetId'>

export const MISSION_SETUP_INTERNAL_SCREENS = new Set<Screen>([
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

/** Trays (Market, Subsurface, Mission Log) are stable URLs that open over the Base. A cold
 * load of one must keep that tray instead of restoring the saved screen, which
 * would make the state -> URL sync rewrite the path to the saved screen. */
export const TRAY_ROUTE_SCREENS = new Set<Screen>(['market', 'hub-subsurface', 'mission-history'])

export function trayScreenFromPath(pathname: string): Screen | null {
  const match = /^\/game\/([^/]+)\/?$/.exec(pathname)
  const screen = match?.[1] as Screen | undefined
  return screen && TRAY_ROUTE_SCREENS.has(screen) ? screen : null
}
