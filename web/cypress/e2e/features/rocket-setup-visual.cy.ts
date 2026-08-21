describe('Rocket setup visual contract', () => {
  const visitRocket = () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'rocket-buy',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'eros',
          tutorial: false,
          rocket: { chassis: 'hull-mk2', propulsion: 'ion-a1', drill: 'laser-drill-t1' },
          player: {
            missionsDone: 1,
            francs: 30_000_000,
            pendingLaunch: false,
            activeMission: null,
            placed: ['launchpad'],
            placementPlots: { launchpad: 0 },
            freeOperations: false,
          },
        }))
        win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
      },
    })
  }

  it('keeps the vehicle stage readable on portrait and desktop', () => {
    cy.viewport(390, 844)
    visitRocket()
    cy.get('[data-testid="rocket-cutaway"]', { timeout: 10000 }).should('be.visible')
    cy.get('[aria-label="Inspect Payload Bay"]').should('be.visible')
    cy.get('.mission-setup-card').scrollIntoView().should('be.visible')
    cy.screenshot('sprint-13-rocket-setup-mobile')

    cy.viewport(1440, 900)
    visitRocket()
    cy.get('[data-testid="rocket-cutaway"]', { timeout: 10000 }).should('be.visible')
    cy.get('[aria-label="Inspect Engine"]').should('be.visible')
    cy.get('.mission-setup-card').scrollIntoView().should('be.visible')
    cy.screenshot('sprint-13-rocket-setup-desktop')
  })
})
