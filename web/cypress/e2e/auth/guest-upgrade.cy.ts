describe('Guest-to-full account upgrade', () => {
  const pbUrl = Cypress.env('SHARED_PB_URL') || 'http://localhost:8090'
  const PB_AUTH_KEY = 'pocketbase_auth'
  const STORAGE_KEY = 'landnam-game-state-v1'

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

  it('shows the save-progress prompt after a mission and upgrades the account', () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        // Seed state as if the guest just finished their first mission.
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          screen: 'hub',
          player: { francs: 10_000_000_000, missionsDone: 1, placed: ['launchpad'], placementPlots: { launchpad: 0 } },
          tutorial: false,
        }))
      },
    })

    // Wait for guest auth to complete.
    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(PB_AUTH_KEY)).to.not.be.null
    })

    cy.get('[data-testid="upgrade-email"]', { timeout: 15000 }).should('be.visible')

    const email = `upgraded_${Math.random().toString(36).slice(2, 8)}@landnam.test`
    const password = 'UpgradedPassword123!'
    let guestEmail: string

    cy.window().then(win => {
      guestEmail = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}').record.email
    })

    cy.get('[data-testid="upgrade-email"]').type(email)
    cy.get('[data-testid="upgrade-password"]').type(password)
    cy.get('[data-testid="upgrade-submit"]').click()

    // Prompt closes once the password is updated and the email-change
    // confirmation has been requested.
    cy.get('[data-testid="upgrade-email"]', { timeout: 15000 }).should('not.exist')

    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      // Email is still the guest placeholder until the confirmation link is
      // clicked, but the new password is already active.
      expect(auth.record.email).to.eq(guestEmail)
      createdUserId = auth.record.id
      createdToken = auth.token
    })

    // The account is immediately usable elsewhere with the new password.
    cy.wait(500)
    cy.then(() => cy.request({
      method: 'POST',
      url: `${pbUrl}/api/collections/users/auth-with-password`,
      body: { identity: guestEmail, password },
      failOnStatusCode: false,
    })).then(({ body, status }) => {
      expect(status, JSON.stringify(body)).to.eq(200)
      expect(body.token).to.be.a('string').and.not.empty
      expect(body.record.id).to.eq(createdUserId)
    })
  })

  it('lets a guest dismiss the prompt and continue playing', () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          screen: 'hub',
          player: { francs: 10_000_000_000, missionsDone: 1, placed: ['launchpad'], placementPlots: { launchpad: 0 } },
          tutorial: false,
        }))
      },
    })

    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(PB_AUTH_KEY)).to.not.be.null
    })

    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      createdUserId = auth.record.id
      createdToken = auth.token
    })

    cy.get('[data-testid="upgrade-dismiss"]', { timeout: 15000 }).should('be.visible').click()
    cy.get('[data-testid="upgrade-email"]').should('not.exist')

    // Snooze persisted, and the guest is still authenticated.
    cy.window().then(win => {
      expect(Number(win.localStorage.getItem('landnam-upgrade-prompt-snooze-until'))).to.be.greaterThan(Date.now())
      expect(JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}').record.id).to.eq(createdUserId)
    })
  })
})
