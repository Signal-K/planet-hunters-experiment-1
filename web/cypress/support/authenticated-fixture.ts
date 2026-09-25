import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

/**
 * Cypress scene fixtures need an account-scoped save now that gameplay is
 * email-account-only. This intentionally seeds PocketBase's browser auth store
 * before React imports it; no retired guest/password shortcut is involved.
 */
export function seedAuthenticatedFixture(
  win: Window,
  state: Partial<GameState>,
  userId = 'e2e-fixture-user',
) {
  const encode = (value: unknown) => win.btoa(JSON.stringify(value)).replace(/=+$/, '')
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`
  win.localStorage.setItem('pocketbase_auth', JSON.stringify({
    token,
    record: {
      id: userId,
      email: `${userId}@example.com`,
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
    },
  }))
  // The app reads the account slot when PocketBase restores synchronously. The
  // legacy slot mirrors the same fixture solely for the deterministic fallback
  // when an intentionally stubbed refresh rejects the synthetic test token.
  win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  win.localStorage.setItem(`${STORAGE_KEY}:user:${userId}`, JSON.stringify(state))
}
