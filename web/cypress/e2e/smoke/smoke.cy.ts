import { seedFixtureSession } from '../../support/authenticated-fixture'

describe('Smoke — Landnam', () => {
  const visitWithState = (state: Record<string, unknown>) => {
    const screen = typeof state.screen === 'string' ? state.screen : 'hub'
    cy.visit(`/game/${screen}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify(state))
        // Suppress AuthGateSheet so it doesn't cover interactive elements
        seedFixtureSession(win)
      },
    })
  }

  it('root shows the program briefing with a way into /game', () => {
    // The root used to redirect straight into /game; it is now a landing page
    // that can be read before signing in (Cycle 2 landing, #76).
    cy.visit('/')
    cy.get('[data-testid="landnam-landing"]').should('be.visible')
    cy.get('[data-testid="landing-enter-operations"]').should('have.attr', 'href', '/game')
  })

  it('/game page loads without crashing', () => {
    cy.visit('/game')
    cy.get('body').should('exist')
  })

  it('/game page has the expected title', () => {
    cy.visit('/game')
    cy.title().should('eq', 'Landnam: Space Program')
  })

  it('backend-health API route responds', () => {
    cy.request({ url: '/api/backend-health', failOnStatusCode: false })
      .its('status')
      .should('be.oneOf', [200, 503])
  })

  it('shows the transit rocket at the movement angle without a trajectory pointer', () => {
    visitWithState({
      screen: 'transit',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'mars',
      tutorial: false,
    })

    cy.get('.trajectory').should('not.exist')
    cy.get('[data-testid="transit-rocket"]').should($rocket => {
      const matrix = new DOMMatrix(getComputedStyle($rocket[0]).transform)
      const angle = Math.round(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI)
      expect(angle).to.eq(56)
    })
  })

  // generated-s1-starter-bulk-1 is a Helios order for 5 platinum; the cargo
  // below fills it so the debrief shows a full client payout.
  it('enforces cargo resolution before reward collection (post-onboarding)', () => {
    visitWithState({
      screen: 'debrief',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'mars',
      lastCargo: { platinum: 5 },
      tutorial: false,
      player: { missionsDone: 3 },
    })

    cy.get('[data-testid="collect-reward-btn"]').should('not.exist')
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.contains('Net').should('be.visible')
    cy.get('[data-testid="collect-reward-btn"]').should('be.visible')
  })

  it('requires explicit vehicle teardown before the ledger during onboarding too', () => {
    // Onboarding debriefs used to auto-resolve cargo into a one-tap collect.
    // KES-348 made the teardown an explicit step for every mission; the unit
    // coverage is DebriefScreen.test.tsx.
    visitWithState({
      screen: 'debrief',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'mars',
      lastCargo: { platinum: 5 },
      tutorial: false,
      player: { missionsDone: 0 },
    })

    cy.get('[data-testid="collect-reward-btn"]').should('not.exist')
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.contains('Net').should('be.visible')
    cy.get('[data-testid="collect-reward-btn"]').should('be.visible')
  })

  it('persists the Skill Tree screen and unlocks an available node', () => {
    visitWithState({
      screen: 'skills',
      player: {
        skillPoints: 1,
        unlockedSkillNodes: [],
      },
      tutorial: false,
    })

    // The Skill Tree was a "Coming Soon" placeholder when this test was
    // written; STS-394/STS-492 replaced it with real nodes and the License
    // Grade ladder, so assert on what actually ships.
    cy.contains('Skill Tree').should('be.visible')
    cy.contains('FLIGHT AUTHORITY').should('exist')
    cy.contains('Skill Nodes').should('be.visible')
    cy.contains('Laser Charge I').should('be.visible')
    cy.reload()
    cy.contains('Skill Tree').should('be.visible')
    cy.contains('Skill Nodes').should('be.visible')
  })

  it('shows Free Ops client missions after M3', () => {
    // Free Ops lists the catalog's client work (useMissionRelayModels); the
    // per-player daily pool this test used to seed is no longer read.
    visitWithState({
      screen: 'missions',
      tutorial: false,
      player: {
        missionsDone: 3,
        freeOperations: true,
        placed: ['launchpad'],
        placementPlots: { launchpad: 0 },
      },
    })

    cy.get('[data-testid="mission-board-section-client"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid^="mission-accept-"]').should('have.length.at.least', 1)
    cy.contains('Helios Propulsion Depot').should('exist')
  })

  it('shows the refinery in the Free Ops Build strip with its seed costs', () => {
    visitWithState({
      screen: 'hub',
      tutorial: false,
      player: {
        francs: 1_000_000_000,
        missionsDone: 3,
        freeOperations: true,
        placed: ['launchpad'],
        placementPlots: { launchpad: 0 },
        stash: { aluminium: 20, copper: 10 },
      },
    })

    // Build is entered from the Hub; a saved 'build' route resumes to the Hub.
    cy.get('[data-testid="hub-edit-build-btn"]', { timeout: 15000 }).click()
    cy.get('[data-testid="hub-new-structure-btn"]').click()
    cy.get('[data-testid="build-place-screen"]').should('be.visible')
    cy.contains('button', 'Refinery').should('be.visible')
  })
})
