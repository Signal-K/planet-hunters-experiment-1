describe('Ship Customiser staged build', () => {
  beforeEach(() => {
    cy.visit('/game/ship-customizer')
  })

  it('opens the customiser route independent of profile state', () => {
    cy.url().should('include', '/game/ship-customizer')
    cy.contains('Rocket Fleet').should('be.visible')
    cy.get('[data-testid="ship-interior-sr1"]').should('be.visible')
    cy.get('[data-testid="ship-build-step"]').within(() => {
      cy.contains('Step 1 / 4').should('be.visible')
      cy.contains('Engine / Thrusters').should('be.visible')
      cy.contains('Ion Thruster T1').should('be.visible')
      cy.contains('Strap Booster Pair').should('not.exist')
    })
    cy.get('[data-testid="confirm-ship-config"]').should('be.disabled')
  })

  it('lets the player replace and refund an unconfirmed stage at full price', () => {
    cy.get('[data-testid="ship-budget"]').invoke('text').then(startingBudget => {
      cy.get('[data-testid="choose-ion-thruster-t1"]').click()
      cy.get('[data-testid="ship-budget"]').should($budget => {
        expect($budget.text()).not.to.eq(startingBudget)
      })
      cy.get('[data-testid="choose-pulse-thruster-t1"]').click()
      cy.get('[data-testid="ship-budget"]').should($budget => {
        expect($budget.text()).not.to.eq(startingBudget)
      })
      cy.get('[data-testid="ship-refund-step"]').click()
      cy.get('[data-testid="ship-budget"]').should('have.text', startingBudget)
      cy.get('[data-testid="ship-review"]').should('contain', '0/4 stages selected')
    })
  })

  it('walks engine to payload and confirms the finished configuration', () => {
    cy.get('[data-testid="choose-ion-thruster-t1"]').click()
    cy.get('[data-testid="ship-review"]').should('contain', '1/4 stages selected')

    cy.get('[data-testid="ship-step-next"]').click()
    cy.get('[data-testid="ship-build-step"]').should('contain', 'Boosters')
    cy.get('[data-testid="choose-strap-booster-t1"]').click()
    cy.get('[data-testid="ship-review"]').should('contain', '2/4 stages selected')

    cy.get('[data-testid="ship-step-next"]').click()
    cy.get('[data-testid="ship-build-step"]').should('contain', 'Command')
    cy.get('[data-testid="choose-cockpit-command-t1"]').click()
    cy.get('[data-testid="ship-review"]').should('contain', '3/4 stages selected')

    cy.get('[data-testid="ship-step-next"]').click()
    cy.get('[data-testid="ship-build-step"]').should('contain', 'Payload')
    cy.get('[data-testid="choose-cargo-payload-t1"]').click()
    cy.get('[data-testid="ship-review"]').should('contain', '4/4 stages selected')

    cy.get('[data-testid="confirm-ship-config"]').should('not.be.disabled').click()
    cy.get('[data-testid="ship-review"]').should('contain', 'Configuration confirmed')
    cy.get('[data-testid="confirm-ship-config"]').should('contain', 'Configuration Confirmed').and('be.disabled')
    cy.get('[data-testid="ship-step-engine"]').should('be.disabled')
    cy.get('[data-testid="choose-cargo-payload-t1"]').should('be.disabled')
  })
})
