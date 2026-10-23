export const OPEN_ORIONIDS_READING_EVENT = 'landnam:open-orionids-reading'

export interface OrionidsReadingDetail {
  /** Runs once the player passes the check, e.g. to open the event itself. */
  onPass?: () => void
}

export function openOrionidsReading(onPass?: () => void): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OrionidsReadingDetail>(OPEN_ORIONIDS_READING_EVENT, { detail: { onPass } }))
}
