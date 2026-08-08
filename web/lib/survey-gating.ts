import type { Screen } from '@/lib/game-types'

// KES-146: this allowlist used to be copy-pasted separately into
// components/game/GameApp.tsx and app/game/(main)/layout.tsx. The GameApp.tsx
// copy got the fix; the layout.tsx copy (the one actually mounted at /game)
// didn't, and a survey popped up over the mining laser button mid-mission as
// a result. One shared source of truth so the two call sites can't drift
// apart again.
//
// Allowlist, not a blocklist — surveys should only ever appear on a genuine
// "resting" screen, never mid-setup or mid-execution of a mission. A
// blocklist of "screens to avoid" rots the same way: miss one screen and a
// survey slides up over it the moment that's the one screen not blocked.
export const SURVEY_SAFE_SCREENS: Screen[] = [
  'hub', 'missions', 'market', 'hangar', 'skills', 'galaxy', 'refinery',
]

export function isSurveySafeScreen(screen: Screen | string): boolean {
  return (SURVEY_SAFE_SCREENS as string[]).includes(screen)
}
