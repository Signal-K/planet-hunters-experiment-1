// A one-visit handoff, like mission-board-nav: browsing evidence never changes a saved run.
export type MiningPlanSelection = { targetId: string; mineral: string; work?: 'survey' }
let pending: MiningPlanSelection | null = null

export function requestMiningPlan(targetId: string, mineral: string): void {
  pending = { targetId, mineral }
}

export function pendingMiningPlan(): MiningPlanSelection | null { return pending }
export function clearMiningPlan(): void { pending = null }

export function requestSurveyPlan(targetId: string): void {
  pending = { targetId, mineral: '', work: 'survey' }
}

let probeTarget: string | null = null
export function requestProbeReadings(targetId: string): void { probeTarget = targetId }
export function pendingProbeReadings(): string | null { return probeTarget }
export function clearProbeReadings(): void { probeTarget = null }
