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

/**
 * SSL-35: URL segments that differ from the internal screen value. The
 * descent-and-touchdown screen keeps its `landing` value (saves and mission
 * phases store it) but is served at /game/descent so it does not read as the
 * Landing layout type. /game/landing redirects there (next.config.ts).
 */
const ROUTE_SEGMENT_BY_SCREEN: Partial<Record<Screen, string>> = {
  landing: 'descent',
}
const SCREEN_BY_ROUTE_SEGMENT = new Map<string, Screen>(
  Object.entries(ROUTE_SEGMENT_BY_SCREEN).map(([screen, segment]) => [segment, screen as Screen]),
)

export function routeSegmentForScreen(screen: Screen): string {
  return ROUTE_SEGMENT_BY_SCREEN[screen] ?? screen
}

/** The screen a `/game/<segment>` URL shows, before validity checks. */
export function screenForRouteSegment(segment: string): Screen {
  return SCREEN_BY_ROUTE_SEGMENT.get(segment) ?? segment as Screen
}

/** Mission creation is one routed scene. Target, vehicle, and preflight are
 * internal steps and must not cause a Next navigation. A bare Free Ops build
 * screen still owns /game/fab because it is not part of a mission setup run. */
export function canonicalGameRoute({ screen, missionId, targetId }: RouteState): string {
  if (screen === 'targets' || screen === 'rocket-buy') return 'missions'
  if (screen === 'fab' && missionId && targetId) return 'missions'
  return routeSegmentForScreen(screen)
}

export function canonicalGamePath(state: RouteState): string {
  return `/game/${canonicalGameRoute(state)}`
}
