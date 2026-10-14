// The cold-open intro is a first-visit screen: once a player has begun operations
// (or already has progress) on this device it never shows again.
export const INTRO_SEEN_STORAGE_KEY = 'landnam-intro-seen-v1'

export function hasSeenIntro(): boolean {
  try {
    return window.localStorage.getItem(INTRO_SEEN_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_SEEN_STORAGE_KEY, '1')
  } catch { /* private mode: the intro may repeat, never block play */ }
}

/** Progress means the player is not new, whichever device or account the save came from. */
export function hasProgress(player: { missionsDone: number; placed: readonly unknown[] }): boolean {
  return player.missionsDone > 0 || player.placed.length > 0
}
