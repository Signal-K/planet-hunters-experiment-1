import { seedFixtureSession } from '../../support/authenticated-fixture'

describe('Pending rocket resume', () => {
  it('opens the built vehicle for inspection instead of charging again', () => {
    cy.visit('/game/launchpad', {
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
        seedFixtureSession(win)
      },
    })

    // The pad's primary control inspects the staged vehicle instead of
    // opening a new purchase.
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 10000 })
      .should('have.attr', 'aria-label', 'Inspect pending launch')
      .click()
    cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="assembly-selected-rocket"]').should('have.text', 'Prospector')
    cy.screenshot('sprint-13-pending-rocket-resume')
    cy.get('[data-testid="purchase-rocket-btn"]').should('not.exist')
  })
})
