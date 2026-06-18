describe('Landnam frontend stack', () => {
  beforeEach(() => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })
  })

  it('renders the design-system onboarding surface', () => {
    cy.get('[data-testid="intro-begin-btn"]').click()
    cy.contains('EARTH BASE · SETUP').should('be.visible')
    cy.contains('Build a Launchpad').should('be.visible')
    cy.contains('DATA LINK · online', { matchCase: false }).should('be.visible')
    cy.contains('button', 'Select a Plot').click()
    cy.contains('Choose a Plot').should('be.visible')
  })

  it('connects to PocketBase through the compose network', () => {
    const pocketbaseUrl = Cypress.env('POCKETBASE_URL')
    cy.request(`${pocketbaseUrl}/api/health`).its('body.message').should('eq', 'API is healthy.')
    cy.request('/api/backend-health').its('body').should('include', {
      ok: true
    })
  })

  it('authenticates and persists game state in PocketBase', () => {
    const pocketbaseUrl = Cypress.env('POCKETBASE_URL')
    const email = `operator-${Date.now()}@landnam.test`
    const password = 'MissionControl42'

    cy.request('POST', `${pocketbaseUrl}/api/collections/users/records`, {
      email,
      password,
      passwordConfirm: password,
      displayName: 'Test Operator',
    }).then(({ body: user }) => {
      cy.request('POST', `${pocketbaseUrl}/api/collections/users/auth-with-password`, {
        identity: email,
        password,
      }).then(({ body: auth }) => {
        cy.request({
          method: 'POST',
          url: `${pocketbaseUrl}/api/collections/game_states/records`,
          headers: { Authorization: auth.token },
          body: {
            user: user.id,
            state: { screen: 'hub', tutorial: true },
          },
        }).its('body.state.screen').should('eq', 'hub')
      })
    })
  })
})
