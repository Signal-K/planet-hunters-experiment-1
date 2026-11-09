import type { Mission, Target } from '@/lib/data'
import type { Player } from '@/lib/game-types'

interface RunCatalog {
  missions: readonly Mission[]
  targets: readonly Target[]
}

/**
 * Finds the mission and target of the run in flight from everything the save knows: the live
 * catalog, the daily pool, and the copies the run carries. The run label ("Type → Target") names
 * the target when the ids were lost. A run missing either piece cannot be flown.
 */
export function resolveRun(
  player: Pick<Player, 'activeMission' | 'dailyClientPool'>,
  ids: { missionId?: string | null; targetId?: string | null },
  catalog: RunCatalog,
): { missionId: string; targetId: string | null; mission: Mission | null; target: Target | null } | null {
  const run = player.activeMission
  if (!run) return null
  const missionId = ids.missionId ?? run.id
  const mission = catalog.missions.find(m => m.id === missionId)
    ?? player.dailyClientPool?.missions.find(m => m.id === missionId)
    ?? (run.id === missionId ? run.mission : undefined)
    ?? null
  const targetName = run.label.split(' → ').pop()
  const target = (ids.targetId ? catalog.targets.find(t => t.id === ids.targetId) : undefined)
    ?? run.target
    ?? catalog.targets.find(t => t.name === targetName)
    ?? null
  return { missionId, targetId: target?.id ?? ids.targetId ?? null, mission, target }
}
