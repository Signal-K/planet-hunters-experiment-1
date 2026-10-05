import type { GameState } from '@/game-context'
import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

// SSL-345: the loop screens share one chrome. Top meta is the shared TopBar;
// the bottom bar is the shell's « » · Market · Menu and nothing else, and it
// never covers a screen's primary control. Phone, compact landscape, desktop.
const VIEWPORTS = [
  { label: 'phone portrait', width: 390, height: 844 },
  { label: 'compact landscape', width: 844, height: 390 },
  { label: 'desktop', width: 1440, height: 900 },
] as const

function state(screen: GameState['screen'], overrides: Partial<GameState> = {}): GameState {
  return {
    screen,
    player: {
      francs: 5_000_000, activeMission: null, missionCount: 4, pendingLaunch: false,
      placed: ['launchpad'], placementPlots: { launchpad: 0 }, controlBuilt: false, missionsDone: 3,
      skillPoints: 0, unlockedSkillNodes: [], freeOperations: true, clientMissions: {}, clientStreaks: {},
      clientCooldowns: {}, researchAnnotations: 0, refineryBuilt: false, refineryUnlocked: true,
      refineryUnlockNotified: true, refineryQueue: [], refinedGoods: {}, launchpadUpgraded: false,
      loanDebt: 0, loanOffered: false, seen_planets: [], roverDeployments: [], clientTerritories: {},
      tessClassifications: {},
    },
    missionId: null, targetId: null, deliveryTargetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
    ...overrides,
  } as unknown as GameState
}

function visit(path: string, s: GameState) {
  cy.visit(path, {
    onBeforeLoad(win) {
      seedAuthenticatedFixture(win, s)
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

function assertSharedBar() {
  cy.get('[data-testid="home-bottom-bar"]', { timeout: 15000 }).should('be.visible')
  for (const id of ['home-bar-switch', 'home-bar-market', 'settings-button']) {
    cy.get(`[data-testid="${id}"]`).should('be.visible')
  }
  cy.get('[data-testid="home-bottom-bar"] button').should('have.length', 3)
  cy.get('[data-testid="home-bar-ops"]').should('not.exist')
  cy.get('[data-testid="home-bar-hub"]').should('not.exist')
  cy.get('.bottom-tab-bar').should('not.exist')
}

describe('SSL-345 one chrome across the loop screens', () => {
  VIEWPORTS.forEach(vp => {
    describe(`${vp.label} ${vp.width}x${vp.height}`, () => {
      beforeEach(() => cy.viewport(vp.width, vp.height))

      it('Base shows only the shared bar', () => {
        visit('/game/hub', state('hub'))
        assertSharedBar()
      })

      it('Debrief uses the shared top bar and keeps its primary control clear of the bottom bar', () => {
        visit('/game/debrief', state('debrief', {
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'eros',
          lastCargo: {},
        }))
        assertSharedBar()
        cy.get('.top-bar').should('have.length', 1)
        cy.get('.top-bar__title').should('contain.text', 'DEBRIEF')
        cy.get('.debrief-hud-header').should('not.exist')
        cy.get('[data-testid="resolve-cargo-btn"]').scrollIntoView().then($btn => {
          cy.get('[data-testid="home-bottom-bar"]').then($bar => {
            expect($btn[0].getBoundingClientRect().bottom).to.be.at.most($bar[0].getBoundingClientRect().top + 1)
          })
        })
      })
    })
  })
})
