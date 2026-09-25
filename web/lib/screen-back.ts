import type { Screen } from '@/lib/game-types'

/** Physical places that host overlay scenes. Overlays return here. */
export const HOST_SCENES = ['hub', 'launchpad', 'academy'] as const
export type HostScene = (typeof HOST_SCENES)[number]

export function isHostScene(screen: Screen): screen is HostScene {
  return screen === 'hub' || screen === 'launchpad' || screen === 'academy'
}

/**
 * One logical parent per scene. This is a DAG: hosts never point at overlays,
 * so Launchpad → Hangar → Back cannot bounce. Wizard steps point at the
 * previous setup step. Overlay rows are the default when no host is remembered.
 */
export const LOGICAL_BACK: Record<Screen, Screen> = {
  intro: 'hub',
  hub: 'hub',
  launchpad: 'hub',
  academy: 'hub',
  hangar: 'hub',
  missions: 'launchpad',
  targets: 'missions',
  'rocket-buy': 'targets',
  fab: 'hub',
  build: 'hub',
  galaxy: 'hub',
  'asteroid-discovery': 'hub',
  skills: 'hub',
  market: 'hub',
  refinery: 'hub',
  'mission-history': 'hub',
  'narrative-ledger': 'hub',
  'instrument-hub': 'hub',
  'surface-ops': 'hub',
  transit: 'hub',
  landing: 'hub',
  mining: 'hub',
  'rover-mining': 'hub',
  delivery: 'hub',
  debrief: 'hub',
}

export function resolveLogicalBack(input: {
  current: Screen
  fallback: Screen
  lastHost: HostScene
  hangarReturn: HostScene
}): Screen {
  const { current, fallback, lastHost, hangarReturn } = input

  if (current === 'hub' || current === 'intro') return 'hub'

  if (current === 'hangar') return hangarReturn

  if (current === 'targets') return 'missions'
  if (current === 'rocket-buy') return 'targets'
  if (current === 'fab' && fallback === 'rocket-buy') return 'rocket-buy'

  if (current === 'launchpad' || current === 'academy') {
    return LOGICAL_BACK[current]
  }

  return lastHost
}
