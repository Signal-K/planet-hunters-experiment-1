describe('Smoke — Landnam', () => {
  const dailyPoolMission = (
    contractor: string,
    mineral: string,
    amount: number,
    title: string,
  ) => ({
    id: `dcp-e2e-${contractor}`,
    title,
    brief: `${title} fixture for the Free Ops mission board smoke test.`,
    contractor,
    tag: 'STARTER',
    difficulty: 'L1',
    locked: false,
    sequence: 4,
    requires: {
      minerals: { [mineral]: amount },
      cargo_min: amount,
      drill_tier: 1,
      max_orbit: 4,
    },
    payout: {
      francs: 750_000,
      affinity: 8,
    },
  })

  const visitWithState = (state: Record<string, unknown>) => {
    const screen = typeof state.screen === 'string' ? state.screen : 'hub'
    cy.visit(`/game/${screen}`, {
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
    cy.contains('Coming Soon').should('be.visible')
    cy.contains('You have 1 skill point banked').should('be.visible')
    cy.reload()
    cy.contains('Skill Tree').should('be.visible')
    cy.contains('Coming Soon').should('be.visible')
  })

  it('shows Free Ops contractor missions after M3', () => {
    const date = new Date()
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    visitWithState({
      screen: 'missions',
      tutorial: false,
      player: {
        missionsDone: 3,
        freeOperations: true,
        contractorMissions: {},
        contractorCooldowns: {},
        dailyContractorPool: {
          date: dateKey,
          acceptedId: null,
          completedIds: [],
          missions: [
            dailyPoolMission('helios-propulsion-depot', 'platinum', 5, 'Helios Propulsion Depot starter contract'),
            dailyPoolMission('arcturus-battery-systems', 'palladium', 5, 'Arcturus Battery Systems starter contract'),
            dailyPoolMission('ferrum-orbital-construction', 'platinum', 5, 'Ferrum Orbital Construction starter contract'),
          ],
        },
      },
    })

    cy.contains('EARTH BASE · FREE OPS').should('be.visible')
    cy.get('[data-testid^="mission-card-dcp-e2e-"]').should('have.length.at.least', 3)
    cy.contains('Helios Propulsion Depot').should('exist')
    cy.contains('Arcturus Battery Systems').scrollIntoView().should('exist')
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
