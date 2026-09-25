import { seedFixtureSession } from '../../support/authenticated-fixture'

describe('Launch preflight visual contract', () => {
  const visitPreflight = () => {
    cy.visit('/game/fab', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'fab',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'eros',
          tutorial: false,
          rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
          player: {
            missionsDone: 0,
            francs: 20_000_000,
            pendingLaunch: false,
            activeMission: null,
            placed: ['launchpad'],
            placementPlots: { launchpad: 0 },
            freeOperations: false,
          },
        }))
        seedFixtureSession(win)
      },
    })
  }

  it('keeps the preflight scene and confirmation action readable across viewports', () => {
    cy.viewport(390, 844)
    visitPreflight()
    // The preflight is the Launch review step of the one mission-setup scene.
    cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('be.visible')
    cy.contains('ALL PARAMETERS PASS').should('be.visible')
    cy.get('[data-testid="launch-btn"]').should('be.visible').and('not.have.css', 'background-color', 'rgb(245, 166, 35)')
    cy.screenshot('sprint-13-launch-preflight-mobile')

    cy.viewport(1440, 900)
    visitPreflight()
    cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('be.visible')
    cy.contains('MISSION REVIEW').should('be.visible')
    cy.get('[data-testid="launch-btn"]').should('be.visible')
    cy.screenshot('sprint-13-launch-preflight-desktop')
  })
})
