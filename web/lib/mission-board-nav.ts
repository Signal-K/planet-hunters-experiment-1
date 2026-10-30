export type MissionBoardTab = 'contracts' | 'program' | 'events' | 'free'

let pending: MissionBoardTab | null = null
let pendingEvent: string | null = null

/** Next Mission Board open lands on this tab (Program from the telescope prompt, for example). */
export function requestMissionBoardTab(tab: MissionBoardTab): void {
  pending = tab
  if (tab !== 'events') pendingEvent = null
}

/** Open the Mission Board on one specific event card. */
export function requestMissionBoardEvent(eventId: string): void {
  pending = 'events'
  pendingEvent = eventId
}

/** Read during render without consuming: React Strict Mode may mount the board twice. */
export function pendingMissionBoardTab(): MissionBoardTab | null {
  return pending
}

export function pendingMissionBoardEvent(): string | null {
  return pendingEvent
}

/** Consume only after the visible board has committed. */
export function clearMissionBoardTab(): void {
  pending = null
  pendingEvent = null
}
