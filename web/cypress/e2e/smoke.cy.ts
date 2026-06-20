describe('Smoke — Landnam', () => {
  const visitWithState = (state: Record<string, unknown>) => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify(state))
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
})
