// A one-visit handoff, like mission-board-nav: browsing evidence never changes a saved run.
export type MiningPlanSelection = { targetId: string; mineral: string }
let pending: MiningPlanSelection | null = null

export function requestMiningPlan(targetId: string, mineral: string): void {
  pending = { targetId, mineral }
}

export function pendingMiningPlan(): MiningPlanSelection | null { return pending }
export function clearMiningPlan(): void { pending = null }
