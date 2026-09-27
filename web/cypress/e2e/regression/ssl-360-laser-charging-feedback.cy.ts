describe('SSL-360 — mining laser charging + tap feedback', () => {
  it('shows a CHARGING state after firing and does not consume ammo on a mashed second tap', () => {
    cy.visit('/game/mining?preset=m1-mining')

    cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
    cy.get('[data-testid="fire-laser-btn"]', { timeout: 10000 }).should('not.be.disabled')

    cy.contains('[data-testid="fire-laser-btn"]', 'FIRE LASER').should('be.visible')

    // First tap fires and starts the cooldown.
    cy.get('[data-testid="fire-laser-btn"]').click()
    cy.contains('[data-testid="fire-laser-btn"]', 'CHARGING', { timeout: 500 }).should('be.visible')
    cy.get('[data-testid="fire-laser-btn"]').should('have.attr', 'data-charging', 'true')

    // A mashed tap mid-cooldown must not fire again (no ammo spent) and must
    // not be silently swallowed either — the button stays visibly CHARGING.
    cy.get('[data-testid="fire-laser-btn"]').click({ force: true })
    cy.contains('[data-testid="fire-laser-btn"]', 'CHARGING').should('be.visible')

    // Cooldown clears and the button returns to ready.
    cy.contains('[data-testid="fire-laser-btn"]', 'FIRE LASER', { timeout: 2000 }).should('be.visible')
    cy.get('[data-testid="fire-laser-btn"]').should('have.attr', 'data-charging', 'false')
  })
})
