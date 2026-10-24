import type { GameState } from '@/lib/game-types'
import type { FriendGiftKind, FriendGiftPayload } from './client'

/** Applies a claimed currency/resource gift to player state. Blueprint gifts
 * go through the existing unlockBlueprint action instead (see game-context's
 * claimFriendGift), so this never needs to touch unlockedBlueprints itself. */
export function applyFriendGiftToPlayer(state: GameState, kind: FriendGiftKind, payload: FriendGiftPayload): GameState {
  if (kind === 'currency') {
    const amount = payload.amount ?? 0
    return { ...state, player: { ...state.player, francs: state.player.francs + amount } }
  }
  if (kind === 'resource' && payload.mineral) {
    const amount = payload.amount ?? 0
    return {
      ...state,
      player: {
        ...state.player,
        stash: {
          ...(state.player.stash ?? {}),
          [payload.mineral]: (state.player.stash?.[payload.mineral] ?? 0) + amount,
        },
      },
    }
  }
  return state
}

export function friendGiftToastMessage(kind: FriendGiftKind, payload: FriendGiftPayload): string {
  if (kind === 'currency') return `Gift claimed: +${payload.amount ?? 0}₣`
  if (kind === 'resource') return `Gift claimed: +${payload.amount ?? 0} ${payload.mineral ?? 'resource'}`
  return 'Gift claimed: blueprint unlocked'
}
