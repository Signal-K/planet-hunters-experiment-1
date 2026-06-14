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

        cy.request({
          method: 'POST',
          url: `${pocketbaseUrl}/api/collections/classifications/records`,
          headers: { Authorization: auth.token },
          body: {
            user: user.id,
            candidate: 'tess-451b',
            verdict: 'planet',
          },
        }).its('body').should('include', {
          candidate: 'tess-451b',
          verdict: 'planet',
        })
      })
    })
  })

  it('classifies the lightcurve signal and returns to target picking', () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'classify',
          missionId: 'm3-nickel-cobalt',
          targetId: null,
          tutorial: true,
          doneSteps: {},
          player: {
            francs: 9500000000,
            level: 2,
            xp: 300,
            activeMission: null,
            missionCount: 1,
            pendingLaunch: false,
            placed: ['launchpad', 'control'],
            controlBuilt: true,
            missionsDone: 2,
            freeOperations: false,
          },
        }))
      },
    })

    cy.contains('Classify Signal').should('be.visible')
    cy.contains('Transit Photometry').should('exist')
    cy.contains('button', 'Planet').click()
    cy.contains('Candidate Confirmed').should('be.visible')
    cy.contains('button', 'Submit Classification').click()
    cy.contains('Pick Target').should('be.visible')
    cy.contains('Continue · Build').should('be.visible')
  })
})
