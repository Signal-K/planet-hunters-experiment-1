/** Mining chrome opens the shared settings sheet. The sheet lives on the game shell, not on this screen. */
export const OPEN_SETTINGS_EVENT = 'landnam-open-settings'

export function openSettings(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
}
