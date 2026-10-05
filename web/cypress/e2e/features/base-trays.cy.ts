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

      it('shows only « », Market and Menu with 14px+ labels', () => {
        visitTray('/game/hub')
        for (const id of ['home-bar-switch', 'home-bar-market', 'settings-button']) {
          cy.get(`[data-testid="${id}"]`).should('be.visible').then($b => {
            expect(parseFloat(getComputedStyle($b[0]).fontSize)).to.be.at.least(14)
          })
        }
        cy.get('[data-testid="home-bar-ops"]').should('not.exist')
        cy.get('[data-testid="home-bar-hub"]').should('not.exist')
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
        cy.get('[data-testid="home-bar-switch"]').should('be.visible')
        // The auth store's first change reloads the account save slot shortly
        // after load and overwrites a screen change made in that window. This
        // spec has no request to wait on, so let it finish before pressing M.
        cy.wait(2000)
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
            // Compare with the tray's own client width: a classic (non-overlay)
            // scrollbar, as on the Linux CI browser, takes ~15px of the 390
            // viewport from the card without the tray being any less full-bleed.
            expect($tray[0].clientWidth, 'tray spans the viewport').to.be.closeTo(width, 16)
            expect(card.width, 'phone tray is full width').to.be.closeTo($tray[0].clientWidth, 1)
          }
        })
        cy.get('body').type('{esc}')
        cy.get('.ln-page-surface--tray').should('not.exist')
      })
      it('opens Mission Log from the Hub dock as a tray over the Base and closes it with Escape', () => {
        visitTray('/game/hub')
        cy.get('[data-testid="hub-mission-log-btn"]').scrollIntoView().should('be.visible').click()
        cy.location('pathname').should('eq', '/game/mission-history')
        cy.get('[data-testid="mission-history-tray"]').should('be.visible')
        cy.get('[data-screen="hub"]').should('exist')
        cy.get('body').type('{esc}')
        cy.location('pathname').should('eq', '/game/hub')
        cy.get('[data-testid="mission-history-tray"]').should('not.exist')
      })

      // Mission Log is a tray over a still Base: the Base keeps its size.
      it('keeps the Base the same size while Mission Log is open', () => {
        visitTray('/game/hub')
        cy.get('[data-testid="hub-mission-log-btn"]').should('be.visible')
        cy.wait(1000)
        cy.get('[data-screen="hub"]').should('be.visible').then($hub => {
          const before = $hub[0].getBoundingClientRect()
          cy.get('[data-testid="hub-mission-log-btn"]').scrollIntoView().click()
          cy.get('[data-testid="mission-history-tray"]').should('be.visible')
          cy.get('[data-screen="hub"]').should('exist').then($still => {
            const after = $still[0].getBoundingClientRect()
            expect(after.width, 'Base width').to.eq(before.width)
            expect(after.height, 'Base height').to.eq(before.height)
            expect(after.top, 'Base top').to.eq(before.top)
          })
        })
      })

      // Mission Log keeps its URL on a cold load, like Market and Subsurface.
      it('keeps the Mission Log URL on a cold load', () => {
        visitTray('/game/mission-history')
        cy.location('pathname').should('eq', '/game/mission-history')
        cy.get('[data-testid="mission-history-tray"]').should('be.visible')
      })
    })
  })
})
