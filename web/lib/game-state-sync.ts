import type { GameState } from '@/lib/game-types'
import { mergeRemoteState, normalizeAndRepair, type PartialSave } from '@/lib/game-state'

/**
 * Decides what an account-state fetch may change, and whether that result may
 * be written back to PocketBase `game_states`.
 *
 * A newly authenticated browser renders DEFAULT_STATE (screen `intro`,
 * `placed: []`) before its account row can be fetched, and the local persist
 * effect then writes that placeholder into the account slot. Neither the
 * in-memory placeholder nor that automatic slot is a local save. Merging it
 * into a server record, or writing it back, wipes a web or native save.
 * Native clients share this collection and keep unknown fields by writing the
 * whole `state` object, so a placeholder update replaces the native record.
 */

export type GameStateLoadDecision = {
  state: GameState
  /** Create a row only after the lookup confirmed the account has none. */
  shouldCreateRemote: boolean
  /**
   * False when this result is only adopting an existing server record.
   * Writing it back would replace that record (including a native save) with
   * a web-normalized copy, or with the sign-in placeholder.
   */
  shouldWriteRemote: boolean
}

export function isSignInPlaceholder(state: PartialSave | null | undefined): boolean {
  if (!state) return true
  const screen = state.screen ?? 'intro'
  const player = state.player
  const placed = player?.placed
  const completed = player?.completedMissions
  const missionsDone = typeof player?.missionsDone === 'number' && Number.isFinite(player.missionsDone)
    ? player.missionsDone
    : 0
  return screen === 'intro'
    && missionsDone <= 0
    && player?.freeOperations !== true
    && (!Array.isArray(placed) || placed.length === 0)
    && (!Array.isArray(completed) || completed.length === 0)
}

/** True when a server (or native) record has anything the placeholder must not replace. */
export function remoteSaveIsNonEmpty(state: PartialSave | null | undefined): boolean {
  return !!state && !isSignInPlaceholder(state)
}

/**
 * The account localStorage slot counts as a save only when it holds progress.
 * The sign-in persist effect writes DEFAULT_STATE into an empty slot before
 * the fetch returns; that string is not a local game.
 */
export function localAccountSlotIsRealSave(raw: string | null | undefined): boolean {
  if (!raw) return false
  try {
    return remoteSaveIsNonEmpty(JSON.parse(raw) as PartialSave)
  } catch {
    return false
  }
}

/** A sign-in placeholder must never replace a non-empty `game_states` record. */
export function mayOverwriteSavedRecord(
  candidate: PartialSave | null | undefined,
  existing: PartialSave | null | undefined,
): boolean {
  if (!remoteSaveIsNonEmpty(existing)) return true
  return !isSignInPlaceholder(candidate)
}

export function resolveGameStateLoad(
  current: GameState,
  remoteState: PartialSave | null,
  hasAccountLocalState: boolean,
): GameStateLoadDecision {
  if (!remoteState) {
    return { state: current, shouldCreateRemote: true, shouldWriteRemote: true }
  }

  if (!hasAccountLocalState) {
    return {
      state: normalizeAndRepair(remoteState),
      shouldCreateRemote: false,
      shouldWriteRemote: false,
    }
  }

  const state = mergeRemoteState(current, remoteState)
  return {
    state,
    shouldCreateRemote: false,
    shouldWriteRemote: mayOverwriteSavedRecord(state, remoteState),
  }
}
