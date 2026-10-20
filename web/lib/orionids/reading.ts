export const OPEN_ORIONIDS_READING_EVENT = 'landnam:open-orionids-reading'

export function openOrionidsReading(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_ORIONIDS_READING_EVENT))
}
