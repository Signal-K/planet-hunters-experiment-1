describe('SSL-89 — refinery placement', () => {
  it('places a refinery and returns to the Base after confirmation', () => {
    cy.visit('/game/build?preset=ui-build')

    cy.contains('button', 'Refinery').click()
    cy.get('[data-testid="build-plot-1"]').click()
    cy.contains('button', 'Confirm · Build Here').click()
    cy.get('[data-testid="building-refinery-hit"]', { timeout: 10000 }).should('be.visible')
  })
})
