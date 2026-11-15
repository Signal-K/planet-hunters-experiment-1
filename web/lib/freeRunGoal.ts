import type { Mission, MineralMeta } from '@/lib/data/types'
import { RESOURCE_FOCUS_MISSION_ID } from '@/lib/data/missions'

/** What the player chose to mine on their own free mining run (Liam, 10 Nov: pick the ore and how much). */
export interface FreeRunGoal {
  missionId: string
  mineral: string
  amount: number
}

/** Cargo units one piece takes in the hold; event fragments take none and are never a goal. */
export function unitsPerPiece(meta: MineralMeta | undefined): number {
  return meta?.cargoUnits ?? 1
}

/** Most pieces of a mineral the rocket's hold can carry in one trip. The hold always caps the cargo. */
export function maxGoalAmount(meta: MineralMeta | undefined, holdUnits: number): number {
  const per = unitsPerPiece(meta)
  return per > 0 ? Math.max(0, Math.floor(holdUnits / per)) : 0
}

export function clampGoalAmount(amount: number, meta: MineralMeta | undefined, holdUnits: number): number {
  return Math.max(1, Math.min(Math.floor(amount) || 1, Math.max(1, maxGoalAmount(meta, holdUnits))))
}

/**
 * The mission the game flies: the authored free run with the player's own ore and amount swapped in.
 * Pay stays the plain market price, because a run on your own account has no client.
 */
export function applyFreeRunGoal(mission: Mission, goal: FreeRunGoal | undefined, minerals: Record<string, MineralMeta>): Mission {
  if (mission.id === RESOURCE_FOCUS_MISSION_ID || !goal || goal.missionId !== mission.id || !minerals[goal.mineral]) return mission
  const meta = minerals[goal.mineral]
  return {
    ...mission,
    requires: {
      ...mission.requires,
      minerals: { [goal.mineral]: goal.amount },
      cargo_min: goal.amount * unitsPerPiece(meta),
      drill_tier: Math.max(1, meta.laserAccess ?? 1),
    },
    payout: mission.payout?.francs ? { ...mission.payout, francs: Math.round(meta.price * goal.amount) } : mission.payout,
  }
}
