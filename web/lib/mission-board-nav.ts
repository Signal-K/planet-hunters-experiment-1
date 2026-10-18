export type MissionBoardTab = 'contracts' | 'program' | 'events' | 'free'

let pending: MissionBoardTab | null = null

/** Next Mission Board open lands on this tab (Program from the telescope prompt, for example). */
export function requestMissionBoardTab(tab: MissionBoardTab): void {
  pending = tab
}

/** Read during render without consuming: React Strict Mode may mount the board twice. */
export function pendingMissionBoardTab(): MissionBoardTab | null {
  return pending
}

/** Consume only after the visible board has committed. */
export function clearMissionBoardTab(): void {
  pending = null
}
