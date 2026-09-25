import { signUpThroughGate } from '../../support/authenticated-fixture'

// Accounts are email + password (KES-97 follow-up). The quick "continue with
// just email" path and its stored-credentials replay were retired, so these
// specs create a real account through the gate's Sign Up tab.
describe('Email account creation (KES-97)', () => {
  const pbUrl = Cypress.env('SHARED_PB_URL') || 'http://localhost:8090'
  const PB_AUTH_KEY = 'pocketbase_auth'

  let createdUserId: string | undefined
  let createdToken: string | undefined

  function accountEmail() {
    return `cy-account-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  }

  function rememberCreatedAccount(email: string) {
    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(PB_AUTH_KEY)).to.not.be.null
    })
    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      expect(auth.token).to.be.a('string').and.not.empty
      expect(auth.record.email).to.eq(email)
      createdUserId = auth.record.id
      createdToken = auth.token
    })
  }

  afterEach(() => {
    if (createdUserId && createdToken) {
      cy.request({
        method: 'DELETE',
        url: `${pbUrl}/api/collections/users/records/${createdUserId}`,
        headers: { Authorization: `Bearer ${createdToken}` },
        failOnStatusCode: false,
      })
      createdUserId = undefined
      createdToken = undefined
    }
  })

  it('creates a real PB account through sign-up and reaches the game', () => {
    cy.clearAllSessionStorage()
    cy.clearAllCookies()
    const email = accountEmail()

    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })

    // New users see the AuthGateSheet — there is no anonymous skip.
    signUpThroughGate(email)
    rememberCreatedAccount(email)

    // Reaches the game (intro for a new player) without ever seeing /auth
    cy.contains('BEGIN OPERATIONS', { timeout: 15000 }).should('be.visible')
  })

  it('restores the signed-in session on a return visit', () => {
    const email = accountEmail()

    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })
    signUpThroughGate(email)
    rememberCreatedAccount(email)

    cy.reload()

    cy.get('[data-testid="auth-gate-email"]').should('not.exist')
    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      expect(auth.record.id).to.eq(createdUserId)
    })
    cy.contains('BEGIN OPERATIONS', { timeout: 15000 }).should('be.visible')
  })
})
