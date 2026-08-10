export {}

const ORIENTATION_STORAGE_KEY = 'landnam-game-state-v1'

describe('Compact landscape orientation policy', () => {
  it('blocks gameplay and explains portrait requirement at mobile landscape size', () => {
    cy.viewport(844, 390)
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem(ORIENTATION_STORAGE_KEY, JSON.stringify({
          screen: 'hub',
          missionId: null,
          targetId: null,
          rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
          lastCargo: null,
          tutorial: false,
          doneSteps: {},
          popup: null,
          menuOpen: false,
          player: { missionsDone: 0, missionCount: 0, francs: 0, placed: ['launchpad'] },
        }))
      },
    })

    cy.get('[data-testid="portrait-required-overlay"]')
      .should('be.visible')
      .and('contain', 'Rotate to portrait')
    cy.get('[data-testid="portrait-required-overlay"]').screenshot('mobile-landscape-orientation-guard')
  })

  it('does not block the supported desktop landscape layout', () => {
    cy.viewport(1280, 800)
    cy.visit('/game')
    cy.get('[data-testid="portrait-required-overlay"]').should('not.be.visible')
  })
})
