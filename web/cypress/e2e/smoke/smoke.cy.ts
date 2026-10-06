import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

describe('Smoke — Landnam', () => {
  const visitWithState = (state: Record<string, unknown>) => {
    const screen = typeof state.screen === 'string' ? state.screen : 'hub'
    cy.visit(`/game/${screen}`, {
      onBeforeLoad(win) {
        seedAuthenticatedFixture(win, state)
      },
    })
  }

  it('root opens the landing briefing and enters /game', () => {
    // SSL-292: `/` is now the Earth Base landing page, not a redirect. Its
    // CONTINUE action is the way into the game and must land on /game.
    cy.visit('/')
    cy.contains('Run your space agency', { matchCase: false }).should('be.visible')
    cy.contains('a, button', 'Continue').click()
    cy.url().should('include', '/game')
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

  it('enforces cargo resolution before reward collection (post-onboarding)', () => {
    // Debrief auto-resolves for onboarding missions (missionsDone < 3), so this
    // gating behavior is only exercised past that boundary — see DebriefScreen.tsx.
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
    // The vehicle teardown plays before the ledger and reward appear.
    cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).click()
    cy.contains('Ledger').should('be.visible')
    cy.get('[data-testid="collect-reward-btn"]').should('be.visible')
  })

  it('requires the vehicle teardown before collecting for onboarding missions too', () => {
    // Debrief no longer auto-resolves for onboarding missions: every debrief
    // starts with the explicit teardown, then offers the reward.
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
    cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).click()
    cy.contains('Ledger').should('be.visible')
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
    // Authority ladder (labelled Flight Authority), so assert on what actually ships.
    cy.contains('Skill Tree').should('be.visible')
    cy.contains('FLIGHT AUTHORITY').should('be.visible')
    cy.contains('Skill Nodes').should('be.visible')
    cy.contains('Laser Charge I').should('be.visible')
    cy.reload()
    cy.contains('Skill Tree').should('be.visible')
    cy.contains('Skill Nodes').should('be.visible')
  })

  it('shows Free Ops client missions after M3', () => {
    // The board lists the catalog's client contracts (the daily pool is no
    // longer surfaced there) as a one-at-a-time carousel with arrows.
    visitWithState({
      screen: 'missions',
      tutorial: false,
      player: {
        missionsDone: 3,
        freeOperations: true,
        clientMissions: {},
        clientCooldowns: {},
      },
    })

    cy.contains('Choose a contract').should('be.visible')
    cy.get('[data-testid="mission-board-section-client"]').should('contain', 'CLIENT CONTRACT 1 /')
    cy.get('button[aria-label="Next contract"]').should('not.be.disabled')
    cy.get('[data-testid^="mission-accept-"]').should('be.visible')
    cy.get('button[aria-label="Next contract"]').click()
    cy.get('[data-testid="mission-board-section-client"]').should('contain', 'CLIENT CONTRACT 2 /')
  })

  it('places a refinery from the Build screen in Free Ops', () => {
    // A saved Build screen is not a resume destination once the base is
    // operational (it hydrates to the Hub); enter it from an empty plot.
    visitWithState({
      screen: 'hub',
      tutorial: false,
      player: {
        francs: 1_000_000_000,
        missionsDone: 3,
        freeOperations: true,
        refineryUnlocked: true,
        placed: ['launchpad', 'surface-silo'],
        placementPlots: { launchpad: 0, 'surface-silo': 2 },
        stash: { aluminium: 20, copper: 10 },
        surfaceOps: { sites: { 'mars-arcadia': { storage: {}, siteAccessPurchasedAt: 1 } } },
      },
    })

    cy.get('[data-testid="hub-edit-build-btn"]', { timeout: 10000 }).click()
    cy.get('[data-testid="build-plot-1"]').click()
    cy.location('pathname', { timeout: 10000 }).should('eq', '/game/build')
    cy.contains('Refinery').should('be.visible')
    cy.contains('8,000,000').should('be.visible')
    cy.contains('20 aluminium').should('be.visible')
    cy.contains('10 copper').should('be.visible')
    cy.contains('button', 'Refinery').click()
    cy.get('[data-testid="build-plot-1"]').click()
    cy.contains('button', 'Confirm · Build Here').click()
    cy.get('[data-testid="building-refinery-hit"]', { timeout: 10000 }).should('be.visible')
  })
})
