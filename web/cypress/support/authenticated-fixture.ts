import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

/**
 * Seed a synthetic PocketBase session so the account-required auth gate stays
 * closed in fixture-driven specs. Gameplay is email-account-only; the retired
 * `landnam-account-credentials` shortcut no longer opens a session. Call this
 * after writing the legacy save slot: that save is mirrored into the account
 * slot the app reads once the session restores.
 */
export function seedFixtureSession(win: Window, userId = 'e2e-fixture-user') {
  const encode = (value: unknown) => win.btoa(JSON.stringify(value)).replace(/=+$/, '')
  // A fixed far-future expiry: specs that freeze the clock with cy.clock()
  // must not see the synthetic session expire and reopen the auth gate.
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id: userId, exp: 4_102_444_800 })}.fixture`
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
  const accountKey = `${STORAGE_KEY}:user:${userId}`
  const legacy = win.localStorage.getItem(STORAGE_KEY)
  if (legacy && !win.localStorage.getItem(accountKey)) win.localStorage.setItem(accountKey, legacy)
}

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
  win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  win.localStorage.setItem(`${STORAGE_KEY}:user:${userId}`, JSON.stringify(state))
  seedFixtureSession(win, userId)
}

/**
 * The contract board is a one-at-a-time carousel. Step through it until the
 * given contract is showing, then return its Accept button.
 */
export function showContract(missionId: string, remaining = 30): Cypress.Chainable<JQuery<HTMLElement>> {
  const accept = `[data-testid="mission-accept-${missionId}"]`
  return cy.get('[data-testid="mission-board-section-client"]', { timeout: 10000 }).then($board => {
    if ($board.find(accept).length > 0 || remaining === 0) return cy.get(accept)
    cy.get('button[aria-label="Next contract"]').click()
    return showContract(missionId, remaining - 1)
  })
}

/** Create a real account through the auth gate's Sign Up tab (email +
 *  password; the quick-email guest path was retired). */
export function signUpThroughGate(email: string, password = 'CypressPassword123') {
  cy.get('[data-testid="auth-gate-email"]', { timeout: 15000 }).should('be.visible')
  cy.contains('[role="tab"]', /sign up/i).click()
  cy.get('[data-testid="auth-gate-email"]').type(email)
  cy.get('[data-testid="auth-gate-password"]').type(password)
  cy.get('[data-testid="auth-gate-password-confirmation"]').type(password)
  cy.get('[data-testid="auth-gate-submit"]').click()
  cy.get('[data-testid="auth-gate-email"]', { timeout: 15000 }).should('not.exist')
}
