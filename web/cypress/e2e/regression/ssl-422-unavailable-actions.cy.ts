import type { GameState } from '../../../game-context'
import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

const BASE_PLAYER = {
  francs: 0,
  activeMission: null,
  missionCount: 1,
  pendingLaunch: false,
  placed: ['launchpad'],
  placementPlots: { launchpad: 0 },
  controlBuilt: false,
  missionsDone: 0,
  freeOperations: false,
  clientMissions: {},
  clientStreaks: {},
  clientCooldowns: {},
  researchAnnotations: 0,
  refineryBuilt: false,
  refineryUnlocked: false,
  refineryQueue: [],
  refinedGoods: {},
  launchpadUpgraded: false,
  loanDebt: 0,
  loanOffered: false,
}

function visitGame(state: Partial<GameState>) {
  cy.visit('/game', { onBeforeLoad(win) {
    win.localStorage.clear()
    win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    seedAuthenticatedFixture(win, state)
  } })
}

describe('SSL-422 unavailable actions preserve their explanation and scene', () => {
  it('explains every missing excavation requirement at compact width', () => {
    cy.viewport(390, 844)
    visitGame({
      screen: 'hub-subsurface', tutorial: false, doneSteps: {},
      player: { ...BASE_PLAYER, stash: {} } as GameState['player'],
    })
    cy.get('[data-testid="subsurface-excavate-cta"]', { timeout: 10000 })
      .should('have.attr', 'aria-disabled', 'true')
      .and('not.be.disabled')
      .click()
    cy.contains('Cannot excavate: need ₣2,000,000 more and 10 more aluminium').should('be.visible')
    cy.screenshot('ssl-422-excavate-shortage-390', { capture: 'viewport' })
  })

  it('leaves the mining scene visible during the Fire Laser training try at desktop width', () => {
    cy.viewport(1280, 720)
    visitGame({
      screen: 'mining', tutorial: false, doneSteps: {},
      missionId: 'generated-s1-starter-bulk-1', targetId: 'mars',
      player: {
        ...BASE_PLAYER,
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order → Mars' },
        missionPhase: 'mining',
        flightPlan: { completed: {}, hidden: false },
      } as GameState['player'],
    })
    cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
    cy.get('.mining-guide-overlay').should('not.exist')
    cy.get('[data-testid="mining-guide-btn"]').click()
    cy.get('.mining-guide-overlay').should('be.visible')
    cy.screenshot('ssl-422-mining-help-opt-in-1280', { capture: 'viewport' })
  })
})
