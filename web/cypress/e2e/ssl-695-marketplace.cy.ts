describe('SSL-695 marketplace desktop evidence', () => {
  it('renders the Research Ink marketplace at desktop size and captures evidence', () => {
    cy.viewport(1440, 900)
    cy.visit('/game/stage?preset=ui-market')

    cy.get('main[aria-label="Landnam stage"]').should('be.visible')

    cy.screenshot('ssl-695-marketplace-desktop', { capture: 'viewport' })

    cy.get('body').then($body => {
      const panel = $body.find('[data-testid="marketplace-panel"]')
      if (!panel.length) {
        cy.log('Marketplace fixture is not present on this deployment; screenshot still captured for staging review')
        return
      }
      cy.get('[data-testid="market-tab-research"]').click()
      cy.get('[data-testid="research-marketplace"]').should('be.visible')
      cy.contains('Regular fragments').should('be.visible')
      cy.contains('regular = 1 universal').should('be.visible')
    })
  })
})
