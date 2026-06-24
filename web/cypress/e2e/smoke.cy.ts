describe('Smoke — Landnam', () => {
  const visitWithState = (state: Record<string, unknown>) => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify(state))
        // Suppress AuthGateSheet so it doesn't cover interactive elements
        win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
      },
    })
  }

  it('root redirects to /game', () => {
    cy.visit('/')
    cy.url().should('include', '/game')
  })

  it('/game page loads without crashing', () => {
    cy.visit('/game')
    cy.get('body').should('exist')
  })

  it('/game page has the expected title', () => {
    cy.visit('/game')
    cy.title().should('eq', 'Landnam — Space Mining')
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

  it('enforces cargo resolution before reward collection', () => {
    visitWithState({
      screen: 'debrief',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'mars',
      lastCargo: { iron: 4 },
      tutorial: false,
    })

    cy.get('[data-testid="collect-reward-btn"]').should('not.exist')
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.contains('Francs Earned').should('be.visible')
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

    cy.contains('Skill Tree').should('be.visible')
    cy.get('[data-testid="skill-points-total"]').should('contain', '1')
    cy.reload()
    cy.contains('Skill Tree').should('be.visible')
    cy.get('[data-testid="skill-node-laser-charge-1"]').click()
    cy.get('[data-testid="skill-points-total"]').should('contain', '0')
    cy.get('[data-testid="skill-node-laser-charge-1"]').should('contain', 'Unlocked')
  })

  it('shows Free Ops contractor missions after M3', () => {
    visitWithState({
      screen: 'missions',
      tutorial: false,
      player: {
        missionsDone: 3,
        freeOperations: true,
        contractorMissions: {},
        contractorCooldowns: {},
      },
    })

    cy.contains('EARTH BASE · FREE OPS').should('be.visible')
    // Contractor names are inside buttons (Cypress prefers button elements),
    // so we scroll to find them rather than relying on initial viewport visibility.
    cy.get('[data-testid^="mission-card-freeops-helios"]').first().scrollIntoView().should('be.visible')
    cy.get('[data-testid^="mission-card-freeops-arcturus"]').first().scrollIntoView().should('be.visible')
    cy.get('[data-testid^="mission-card-freeops-ferrum"]').first().scrollIntoView().should('be.visible')
    cy.contains('Refinery contracts detected').should('be.visible')
  })

  it('shows refinery as buildable from structure seed data in Free Ops', () => {
    visitWithState({
      screen: 'build',
      tutorial: false,
      player: {
        francs: 1_000_000_000,
        missionsDone: 3,
        freeOperations: true,
        refineryUnlocked: true,
        placed: ['launchpad'],
        placementPlots: { launchpad: 0 },
        stash: { aluminium: 20, copper: 10 },
      },
    })

    cy.contains('Refinery').should('be.visible')
    cy.contains('800,000,000').should('be.visible')
    cy.contains('20 aluminium').should('be.visible')
    cy.contains('10 copper').should('be.visible')
  })
})
