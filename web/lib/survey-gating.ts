import type { Screen } from '@/lib/game-types'

// KES-146: this allowlist used to be copy-pasted into two app shells, and a
// fix landed in only one of them, so a survey popped up over the mining laser
// button mid-mission. Keep it here as the single source of truth.
//
// Allowlist, not a blocklist — surveys should only ever appear on a genuine
// "resting" screen, never mid-setup or mid-execution of a mission. A
// blocklist of "screens to avoid" rots the same way: miss one screen and a
// survey slides up over it the moment that's the one screen not blocked.
export const SURVEY_SAFE_SCREENS: Screen[] = [
  'hub', 'missions', 'market', 'hangar', 'skills', 'galaxy', 'refinery', 'instrument-hub',
]

export function isSurveySafeScreen(screen: Screen | string): boolean {
  return (SURVEY_SAFE_SCREENS as string[]).includes(screen)
}
