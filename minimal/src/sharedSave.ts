// What Minimal shares with the player's Landnam save (Liam, 2026-11-19): their
// francs, and whether they have finished Landnam's onboarding. Everything else
// (chapter progress) is Minimal's own. Read through Landnam's own helpers so the
// two games cannot disagree about where the save lives or what "finished" means.
import { GAME_STATE_STORAGE_KEY, gameStateStorageKey } from '@landnam/lib/game-state-storage'
import { isTrainingComplete, type FlightPlanProgress } from '@landnam/lib/systems/FlightPlanSystem'

export interface SharedSave {
  francs: number
  onboardingDone: boolean
  /** False when this device holds no Landnam save for the pilot yet. */
  found: boolean
}

interface SavedPlayer {
  francs?: number
  freeOperations?: boolean
  flightPlan?: FlightPlanProgress
}

export function readSharedSave(userId: string): SharedSave {
  if (import.meta.env.DEV) {
    const stage = new URLSearchParams(location.search).get('stage')
    if (stage === 'onboarded') return { francs: 31_400_000, onboardingDone: true, found: true }
    if (stage !== null) return { francs: 9_000_000, onboardingDone: false, found: true }
  }
  try {
    const raw = localStorage.getItem(gameStateStorageKey(GAME_STATE_STORAGE_KEY, userId))
    const player = raw ? (JSON.parse(raw) as { player?: SavedPlayer }).player : undefined
    if (!player) return { francs: 0, onboardingDone: false, found: false }
    return {
      francs: typeof player.francs === 'number' ? player.francs : 0,
      onboardingDone: !!player.freeOperations || isTrainingComplete(player.flightPlan),
      found: true,
    }
  } catch {
    return { francs: 0, onboardingDone: false, found: false }
  }
}
