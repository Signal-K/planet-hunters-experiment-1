export type MissionBoardTab = 'contracts' | 'program' | 'events' | 'free'

let pending: MissionBoardTab | null = null
let pendingEvent: string | null = null
let pendingMineral: string | null = null

/** Open the Free run map showing only the places that hold this mineral (e.g. "Find aluminium"). */
export function requestMissionBoardMineral(mineralId: string): void {
  pending = 'free'
  pendingEvent = null
  pendingMineral = mineralId
}

export function pendingMissionBoardMineral(): string | null {
  return pendingMineral
}

/** Next Mission Board open lands on this tab (Program from the telescope prompt, for example). */
export function requestMissionBoardTab(tab: MissionBoardTab): void {
  pending = tab
  pendingMineral = null
  if (tab !== 'events') pendingEvent = null
}

/** Open the Mission Board on one specific event card. */
export function requestMissionBoardEvent(eventId: string): void {
  pending = 'events'
  pendingEvent = eventId
  pendingMineral = null
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
  pendingMineral = null
}
