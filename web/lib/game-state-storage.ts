export const GAME_STATE_STORAGE_KEY = 'landnam-game-state-v1'

/**
 * Local saves are private to an account once the shared auth identity is
 * known. The unscoped key remains the guest/legacy slot so existing offline
 * players and preview fixtures can still hydrate, but it is never used as an
 * authenticated user's save.
 */
export function accountGameStateStorageKey(baseKey: string, userId: string): string {
  return `${baseKey}:user:${userId}`
}

export function gameStateStorageKey(baseKey: string, userId?: string | null): string {
  return userId ? accountGameStateStorageKey(baseKey, userId) : baseKey
}
