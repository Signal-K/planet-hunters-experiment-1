describe('Guest account auto-creation', () => {
  const pbUrl = Cypress.env('SHARED_PB_URL') || 'http://localhost:8090'
  const PB_AUTH_KEY = 'pocketbase_auth'
  const GUEST_CREDENTIALS_KEY = 'landnam-guest-credentials'

  let createdUserId: string | undefined
  let createdToken: string | undefined

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

  it('creates a guest PB account on first visit and persists credentials', () => {
    cy.clearAllSessionStorage()
    cy.clearAllCookies()

    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })

    // New users see the AuthGateSheet — click "Continue without account" to trigger guest creation
    cy.get('[data-testid="auth-gate-skip"]', { timeout: 10000 }).click()

    // Wait for ensureGuestAuth to succeed: both keys must be set
    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(PB_AUTH_KEY)).to.not.be.null
      expect(win.localStorage.getItem(GUEST_CREDENTIALS_KEY)).to.not.be.null
    })

    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      const creds = JSON.parse(win.localStorage.getItem(GUEST_CREDENTIALS_KEY) || '{}')
      expect(auth.token).to.be.a('string').and.not.empty
      expect(auth.record.name).to.eq('Anonymous Explorer')
      expect(creds.email).to.match(/^guest_.+@landnam\.guest$/)

      createdUserId = auth.record.id
      createdToken = auth.token
    })

    // Reaches the game (intro/tutorial for a new player) without ever seeing /auth
    cy.contains('BEGIN OPERATIONS', { timeout: 15000 }).should('be.visible')
  })

  it('reuses stored guest credentials on a return visit', () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })

    // New users see the AuthGateSheet — click "Continue without account" to trigger guest creation
    cy.get('[data-testid="auth-gate-skip"]', { timeout: 10000 }).click()

    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(GUEST_CREDENTIALS_KEY)).to.not.be.null
    })

    let firstEmail: string
    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      createdUserId = auth.record.id
      createdToken = auth.token
      firstEmail = JSON.parse(win.localStorage.getItem(GUEST_CREDENTIALS_KEY) || '{}').email
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
      const creds = JSON.parse(win.localStorage.getItem(GUEST_CREDENTIALS_KEY) || '{}')
      expect(creds.email).to.eq(firstEmail)
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      expect(auth.record.id).to.eq(createdUserId)
    })

    cy.contains('BEGIN OPERATIONS', { timeout: 15000 }).should('be.visible')
  })
})
