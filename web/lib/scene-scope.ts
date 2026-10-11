import type { Screen } from './game-types'
import type { Mission, Target } from './data/types'
import { compatibleTargetsFor } from './data/targets'
import { SCENE_NAMES } from './ui-strings'

export type SceneScope =
  | { kind: 'earth-base'; id: 'earth-base'; label: typeof SCENE_NAMES.base }
  | { kind: 'body'; id: string; label: string }

export const EARTH_BASE_SCOPE: SceneScope = {
  kind: 'earth-base',
  id: 'earth-base',
  label: SCENE_NAMES.base,
}

interface SceneScopeInput {
  screen: Screen
  targetId: string | null
  target?: Target | null
}

const TARGET_SURFACE_SCREENS = new Set<Screen>([
  'transit',
  'landing',
  'mining',
  'rover-mining',
  'delivery',
])

/** Resolve the physical body represented by the current routed scene. */
export function deriveSceneScope({ screen, targetId, target }: SceneScopeInput): SceneScope {
  if (TARGET_SURFACE_SCREENS.has(screen) && targetId) {
    return { kind: 'body', id: targetId, label: target?.name ?? targetId }
  }
  return EARTH_BASE_SCOPE
}

/** Keep mission-board scoping a view concern, separate from economy rules. */
export function missionMatchesSceneScope(
  mission: Mission,
  scope: SceneScope,
  targets: Target[],
): boolean {
  if (scope.kind === 'earth-base') return true
  if (mission.targetId) return mission.targetId === scope.id
  return compatibleTargetsFor(mission, targets).some(target => target.id === scope.id)
}

export function filterMissionsForSceneScope(
  missions: Mission[],
  scope: SceneScope,
  targets: Target[],
  onboarding: boolean,
): Mission[] {
  if (onboarding || scope.kind === 'earth-base') return missions
  return missions.filter(mission => missionMatchesSceneScope(mission, scope, targets))
}
