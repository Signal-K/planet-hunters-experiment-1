import type { GameState } from '@/lib/game-types'
import { mergeRemoteState, normalizeAndRepair, type PartialSave } from '@/lib/game-state'

/**
 * Decides what an account-state fetch may change.
 *
 * A newly authenticated browser renders DEFAULT_STATE before its account row
 * can be fetched. That placeholder is not a local save and must never win a
 * merge against an existing server record. Only an account slot that existed
 * before this authentication may take part in the normal conflict merge.
 */
export function resolveGameStateLoad(
  current: GameState,
  remoteState: PartialSave | null,
  hasAccountLocalState: boolean,
): { state: GameState, shouldCreateRemote: boolean } {
  if (!remoteState) return { state: current, shouldCreateRemote: true }

  return {
    state: hasAccountLocalState
      ? mergeRemoteState(current, remoteState)
      : normalizeAndRepair(remoteState),
    shouldCreateRemote: false,
  }
}
