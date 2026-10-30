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
  'hub', 'missions', 'market', 'hangar', 'galaxy', 'refinery', 'instrument-hub',
]

export function isSurveySafeScreen(screen: Screen | string): boolean {
  return (SURVEY_SAFE_SCREENS as string[]).includes(screen)
}

// SSL-649: a Base callout is a prompt the player has to read, and it is portaled above the survey card, so it can hide the
// card's Skip. The card waits while any callout is open and comes back when the last one closes.
const holds = new Set<symbol>()
const listeners = new Set<() => void>()
const notify = () => { listeners.forEach(listener => listener()) }

/** Holds surveys back until the returned release function is called. */
export function holdSurveys(): () => void {
  const hold = Symbol('survey-hold')
  holds.add(hold)
  notify()
  return () => { if (holds.delete(hold)) notify() }
}

export function isSurveyHeld(): boolean {
  return holds.size > 0
}

export function subscribeSurveyHold(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
