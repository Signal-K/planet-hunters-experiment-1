export type MissionBoardTab = 'contracts' | 'program' | 'events' | 'free'

let pending: MissionBoardTab | null = null

/** Next Mission Board open lands on this tab (Program from the telescope prompt, for example). */
export function requestMissionBoardTab(tab: MissionBoardTab): void {
  pending = tab
}

export function takeMissionBoardTab(): MissionBoardTab | null {
  const tab = pending
  pending = null
  return tab
}
