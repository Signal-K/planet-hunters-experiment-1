describe('Guest-to-full account upgrade', () => {
  const pbUrl = Cypress.env('SHARED_PB_URL') || 'http://localhost:8090'
  const PB_AUTH_KEY = 'pocketbase_auth'
  const STORAGE_KEY = 'landnam-game-state-v1'

  let createdUserId: string | undefined
  let createdToken: string | undefined

  function visitAsGuest() {
    const email = `guest_${Math.random().toString(36).slice(2, 10)}@landnam.guest`
    const password = 'GuestPassword123!'

    cy.request('POST', `${pbUrl}/api/collections/users/records`, {
      email,
      password,
      passwordConfirm: password,
      name: 'E2E Guest',
    }).then(({ body: user }) => {
      createdUserId = user.id
      return cy.request('POST', `${pbUrl}/api/collections/users/auth-with-password`, {
        identity: email,
        password,
      })
    }).then(({ body: auth }) => {
      createdToken = auth.token
      cy.visit('/game', {
        onBeforeLoad(win) {
          win.localStorage.clear()
          win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email, password }))
          win.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            screen: 'hub',
            player: { francs: 10_000_000_000, missionsDone: 1, placed: ['launchpad'], placementPlots: { launchpad: 0 } },
            tutorial: false,
          }))
        },
      })
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

  it('shows the save-progress prompt after a mission and upgrades the account', () => {
    visitAsGuest()

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

  it('keeps the mandatory save-progress prompt visible for a legacy guest', () => {
    visitAsGuest()

    cy.window({ timeout: 15000 }).should(win => {
      expect(win.localStorage.getItem(PB_AUTH_KEY)).to.not.be.null
    })

    cy.window().then(win => {
      const auth = JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}')
      createdUserId = auth.record.id
      createdToken = auth.token
    })

    // KES-97 makes this prompt mandatory for legacy guest accounts: there is
    // no dismiss action until the player supplies a real email.
    cy.get('[data-testid="upgrade-email"]').should('be.visible')
    cy.window().then(win => {
      expect(JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}').record.id).to.eq(createdUserId)
    })
  })
})
