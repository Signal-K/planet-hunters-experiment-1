import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

// SSL-346 / SSL-347 / SSL-349: one shared bar on every live surface, trays that
// open over a still Base, stable tray URLs, and Esc to close.
const STORAGE_KEY = 'landnam-game-state-v1'

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    screen: 'hub',
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: {
      francs: 10_000_000_000, activeMission: null, missionCount: 1, pendingLaunch: false,
      placed: ['launchpad'], placementPlots: { launchpad: 1 }, controlBuilt: false, missionsDone: 3,
      skillPoints: 0, unlockedSkillNodes: [], freeOperations: true, clientMissions: {}, clientStreaks: {},
      clientCooldowns: {}, researchAnnotations: 0, refineryBuilt: false, refineryUnlocked: false,
      refineryUnlockNotified: false, refineryQueue: [], refinedGoods: {}, launchpadUpgraded: false,
      loanDebt: 0, loanOffered: false, seen_planets: [], roverDeployments: [], clientTerritories: {},
    },
    ...overrides,
  } as GameState
}

function visitTray(route: string) {
  cy.intercept('GET', '**/api/collections/game_states/records*', { statusCode: 404, body: { message: 'not found' } })
  cy.intercept('POST', '**/api/collections/game_states/records', { statusCode: 200, body: { id: 'tray-state', user: 'e2e-user', state: {} } })
  cy.intercept('PATCH', '**/api/collections/game_states/records/*', { statusCode: 200, body: { id: 'tray-state', user: 'e2e-user', state: {} } })
  cy.visit(route, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state()))
      seedFixtureSession(win)
    },
  })
}

describe('Base trays and shared bar', () => {
  const VIEWPORTS = [[390, 844], [1440, 900]] as const

  VIEWPORTS.forEach(([width, height]) => {
    describe(`${width}x${height}`, () => {
      beforeEach(() => cy.viewport(width, height))

      it('shows OPS, Hub, « », Market and Menu with 12px+ labels', () => {
        visitTray('/game/hub')
        for (const id of ['home-bar-ops', 'home-bar-hub', 'home-bar-switch', 'home-bar-market', 'settings-button']) {
          cy.get(`[data-testid="${id}"]`).should('be.visible').then($b => {
            expect(parseFloat(getComputedStyle($b[0]).fontSize)).to.be.at.least(12)
          })
        }
      })

      it('closes Market with Escape and returns to the Base', () => {
        visitTray('/game/hub')
        cy.get('[data-testid="home-bar-market"]').click()
        cy.location('pathname').should('eq', '/game/market')
        cy.get('body').type('{esc}')
        cy.location('pathname').should('eq', '/game/hub')
      })

      it('opens Market with the M key', () => {
        visitTray('/game/hub')
        cy.get('[data-testid="home-bar-hub"]').should('be.visible')
        cy.get('body').type('m')
        cy.location('pathname').should('eq', '/game/market')
      })

      it('keeps the Market URL on a cold load', () => {
        visitTray('/game/market')
        cy.location('pathname').should('eq', '/game/market')
        cy.get('[data-testid="home-bar-market"]').should('be.visible')
      })

      it('opens Subsurface from its own URL and closes it with Escape', () => {
        visitTray('/game/hub-subsurface')
        cy.location('pathname').should('eq', '/game/hub-subsurface')
        cy.get('[data-testid="hub-subsurface-view"]').should('be.visible')
        cy.get('body').type('{esc}')
        cy.location('pathname').should('eq', '/game/hub')
        cy.get('[data-testid="hub-subsurface-view"]').should('not.be.visible')
      })

      it('opens Menu as a tray and closes it with Escape', () => {
        visitTray('/game/hub')
        cy.get('[data-testid="settings-button"]').click()
        cy.get('.ln-page-surface--tray').should('be.visible').then($tray => {
          const card = $tray.find('.ln-page-surface__content')[0].getBoundingClientRect()
          if (width >= 768) {
            expect(card.width, 'centered card, not full bleed').to.be.lessThan(width)
            expect(Math.abs(card.left + card.width / 2 - width / 2)).to.be.lessThan(2)
          } else {
            expect(card.width, 'phone tray is full width').to.be.closeTo(width, 1)
          }
        })
        cy.get('body').type('{esc}')
        cy.get('.ln-page-surface--tray').should('not.exist')
      })
    })
  })
})
