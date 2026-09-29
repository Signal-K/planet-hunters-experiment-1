import { seedFixtureSession } from '../../support/authenticated-fixture'

describe('Rocket setup visual contract', () => {
  const visitRocket = () => {
    cy.visit('/game/missions', {
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
        seedFixtureSession(win)
      },
    })
  }

  it('keeps the vehicle stage readable on portrait and desktop', () => {
    cy.viewport(390, 844)
    visitRocket()
    // Vehicle selection is the Blueprint step of the mission-setup scene: a
    // schematic plus its fixed room manifest.
    cy.get('[data-testid="mission-rocket-blueprint"]', { timeout: 10000 }).should('be.visible')
    cy.get('[aria-label$=" schematic"]').should('be.visible')
    cy.contains('ROOM SLOTS').scrollIntoView().should('be.visible')
    cy.get('[data-testid="purchase-rocket-btn"]').scrollIntoView().should('be.visible')
    cy.screenshot('sprint-13-rocket-setup-mobile')

    cy.viewport(1440, 900)
    visitRocket()
    cy.get('[data-testid="mission-rocket-blueprint"]', { timeout: 10000 }).should('be.visible')
    cy.get('[aria-label$=" schematic"]').should('be.visible')
    cy.contains('ROOM SLOTS').should('be.visible')
    cy.get('[data-testid="purchase-rocket-btn"]').should('be.visible')
    cy.screenshot('sprint-13-rocket-setup-desktop')
  })
})
