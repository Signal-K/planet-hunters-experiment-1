import type { GameState } from '../../../game-context'
import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

const TUTORIAL_ACK_KEY = 'ln_tutorial_complete_ack'

const POST_TUTORIAL: Partial<GameState> = {
  screen: 'hub', tutorial: false, doneSteps: {},
  player: {
    francs: 11_580_000_000, activeMission: null, missionCount: 1,
    pendingLaunch: false, placed: ['launchpad', 'refinery'],
    placementPlots: { launchpad: 0, refinery: 1 }, controlBuilt: true,
    missionsDone: 3, skillPoints: 3, unlockedSkillNodes: [], freeOperations: true,
    clientMissions: {}, clientCooldowns: {}, researchAnnotations: 0,
    refineryBuilt: true, refineryQueue: [], refinedGoods: {}, launchpadUpgraded: false,
    loanDebt: 0, loanOffered: false,
  },
} as Partial<GameState>

const ACTIVE_RUN: Partial<GameState> = {
  ...POST_TUTORIAL,
  player: { ...POST_TUTORIAL.player, activeMission: { id: 'baseline-extraction', label: 'Baseline extraction → Eros' }, missionPhase: 'transit' } as GameState['player'],
}

function visitHub(state: Partial<GameState> = POST_TUTORIAL) {
  cy.visit('/game', { onBeforeLoad(win) {
    win.localStorage.clear()
    win.localStorage.setItem(TUTORIAL_ACK_KEY, '1')
    seedAuthenticatedFixture(win, state)
  } })
}

describe('Hub shared chrome and sky controls', () => {
  it('replaces the retired progression card with persistent bars', () => {
    visitHub()
    cy.get('[data-testid^="progression-card-"]').should('not.exist')
    cy.get('[data-testid="home-bottom-bar"]').should('be.visible')
    cy.get('[data-testid="home-bottom-bar"]').within(() => {
      cy.get('[data-testid="home-bar-ops"]').should('be.visible')
      cy.get('[data-testid="home-bar-hub"]').should('be.visible')
      cy.get('[data-testid="home-bar-market"]').should('be.visible')
      cy.get('[data-testid="settings-button"]').should('be.visible')
    })
  })

  it('shows an active craft in the sky and resumes the run from it', () => {
    visitHub(ACTIVE_RUN)
    cy.get('[data-testid="hub-sky-craft"]').should('be.visible').click()
    cy.location('pathname', { timeout: 10_000 }).should('match', /\/game\/transit$/)
  })

  it('uses an addressable Subsurface tray without removing the Base root', () => {
    visitHub()
    cy.get('[data-testid="hub-subsurface-btn"]').click()
    cy.location('pathname', { timeout: 10_000 }).should('eq', '/game/hub-subsurface')
    cy.get('[data-testid="hub-terrain-fallback"]').should('exist')
    cy.get('[data-testid="hub-subsurface-view"]').should('be.visible')
  })
})
