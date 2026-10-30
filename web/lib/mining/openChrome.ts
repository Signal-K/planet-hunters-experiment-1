/** Chrome opens the shared settings and friends sheets. The sheets live on the game shell, not on the screen. */
export const OPEN_SETTINGS_EVENT = 'landnam-open-settings'
export const OPEN_FRIENDS_EVENT = 'landnam-open-friends'

export function openSettings(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
}

export function openFriends(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_FRIENDS_EVENT))
}
