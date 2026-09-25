describe('Email-only account creation (KES-97)', () => {
  const pbUrl = Cypress.env('SHARED_PB_URL') || 'http://localhost:8090'
  const PB_AUTH_KEY = 'pocketbase_auth'
  const ACCOUNT_CREDENTIALS_KEY = 'landnam-account-credentials'

  let createdUserId: string | undefined
  let createdToken: string | undefined

  function quickEmail() {
    return `cy-quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
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

  it('creates a real-email PB account via the quick-continue path and persists credentials', () => {
    cy.clearAllSessionStorage()
    cy.clearAllCookies()

    const email = quickEmail()

    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })

    // New users see the AuthGateSheet — there is no anonymous skip anymore,
    // only sign-in/sign-up or "continue with just email".
    cy.get('[data-testid="auth-gate-quick-email"]', { timeout: 10000 }).type(email)
    cy.get('[data-testid="auth-gate-quick-submit"]').click()

    // Wait for real email-account creation to succeed: both keys must be set
    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(PB_AUTH_KEY)).to.not.be.null
      expect(win.localStorage.getItem(ACCOUNT_CREDENTIALS_KEY)).to.not.be.null
    })

    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      const creds = JSON.parse(win.localStorage.getItem(ACCOUNT_CREDENTIALS_KEY) || '{}')
      expect(auth.token).to.be.a('string').and.not.empty
      expect(auth.record.email).to.eq(email)
      expect(creds.email).to.eq(email)

      createdUserId = auth.record.id
      createdToken = auth.token
    })

    // Reaches the game (intro/tutorial for a new player) without ever seeing /auth
    cy.contains('BEGIN OPERATIONS', { timeout: 15000 }).should('be.visible')
  })

  it('reuses stored credentials on a return visit', () => {
    const email = quickEmail()

    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })

    cy.get('[data-testid="auth-gate-quick-email"]', { timeout: 10000 }).type(email)
    cy.get('[data-testid="auth-gate-quick-submit"]').click()

    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(ACCOUNT_CREDENTIALS_KEY)).to.not.be.null
      expect(win.localStorage.getItem(PB_AUTH_KEY)).to.not.be.null
    })

    let firstEmail: string
    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      createdUserId = auth.record.id
      createdToken = auth.token
      firstEmail = JSON.parse(win.localStorage.getItem(ACCOUNT_CREDENTIALS_KEY) || '{}').email
    })

    // Simulate a return visit: clear only the PB auth token, keep credentials
    cy.window().then(win => {
      win.localStorage.removeItem(PB_AUTH_KEY)
    })
    cy.reload()

    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(PB_AUTH_KEY)).to.not.be.null
    })

    cy.window().then(win => {
      const creds = JSON.parse(win.localStorage.getItem(ACCOUNT_CREDENTIALS_KEY) || '{}')
      expect(creds.email).to.eq(firstEmail)
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      expect(auth.record.id).to.eq(createdUserId)
    })

    cy.contains('BEGIN OPERATIONS', { timeout: 15000 }).should('be.visible')
  })
})
