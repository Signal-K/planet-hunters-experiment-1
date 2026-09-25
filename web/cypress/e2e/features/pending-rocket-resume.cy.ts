describe('Pending rocket resume', () => {
  it('opens the built vehicle for inspection instead of charging again', () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'launchpad',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'eros',
          tutorial: false,
          rocket: { chassis: 'hull-mk2', propulsion: 'ion-a1', drill: 'laser-drill-t1' },
          player: {
            missionsDone: 0,
            francs: 0,
            pendingLaunch: true,
            pendingRocketId: 'prospector',
            activeMission: null,
            placed: ['launchpad'],
            placementPlots: { launchpad: 0 },
            freeOperations: false,
          },
        }))
        win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
      },
    })

    cy.get('[data-testid="launchpad-rocket-fleet"]', { timeout: 10000 }).should('be.visible').click()
    cy.contains('Confirm Rocket', { timeout: 10000 }).should('be.visible')
    cy.screenshot('sprint-13-pending-rocket-resume')
    cy.contains('Purchase').should('not.exist')
  })
})
