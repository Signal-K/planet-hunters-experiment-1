import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

/** Seed a synthetic PocketBase session so fixture-driven specs reach the
 * account-required game. The retired credential shortcut does not open one. */
export function seedFixtureSession(win: Window, userId = 'e2e-fixture-user') {
  const encode = (value: unknown) => win.btoa(JSON.stringify(value)).replace(/=+$/, '')
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

/** Move the one-at-a-time contract carousel to a specific mission. */
export function showContract(missionId: string, remaining = 30): Cypress.Chainable<JQuery<HTMLElement>> {
  const accept = `[data-testid="mission-accept-${missionId}"]`
  return cy.get('[data-testid="mission-board-section-client"]', { timeout: 10000 }).then($board => {
    if ($board.find(accept).length > 0 || remaining === 0) return cy.get(accept)
    cy.get('button[aria-label="Next contract"]').click()
    return showContract(missionId, remaining - 1)
  })
}

/** Create a real email account through the auth gate's Sign Up tab. */
export function signUpThroughGate(email: string, password = 'CypressPassword123') {
  cy.get('[data-testid="auth-gate-email"]', { timeout: 15000 }).should('be.visible')
  cy.contains('[role="tab"]', /sign up/i).click()
  cy.get('[data-testid="auth-gate-email"]').type(email)
  cy.get('[data-testid="auth-gate-password"]').type(password)
  cy.get('[data-testid="auth-gate-password-confirmation"]').type(password)
  cy.get('[data-testid="auth-gate-submit"]').click()
  cy.get('[data-testid="auth-gate-email"]', { timeout: 15000 }).should('not.exist')
}
