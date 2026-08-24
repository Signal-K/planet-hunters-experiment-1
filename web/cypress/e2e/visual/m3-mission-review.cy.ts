// Dedicated M3 mission review harness (KES-235).
// This is intentionally a state-seeded review environment: it reaches each
// authored operation state deterministically, while the delivery leg still
// mounts the real TakeOn canvas and exercises the real dump/redock controls.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const VIEWPORTS = [
  { key: 'mobile-portrait', label: 'mobile portrait', width: 390, height: 844 },
  { key: 'tablet-portrait', label: 'tablet portrait', width: 834, height: 1194 },
  { key: 'desktop', label: 'desktop', width: 1440, height: 900 },
  { key: 'landscape', label: 'landscape', width: 926, height: 428 },
] as const
const requestedViewport = Cypress.env('m3ReviewViewport') as string | undefined
const reviewViewports = VIEWPORTS.filter(viewport => !requestedViewport || viewport.key === requestedViewport)

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 9_000_000_000,
    activeMission: { id: 'lnm_m3_relay_bennu_vesta', label: 'Belt Courier Run' },
    missionCount: 2,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 2,
    freeOperations: false,
    clientMissions: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    ...overrides,
  } as GameState['player']
}

function visitWithState(path: string, state: Partial<GameState>) {
  const full: GameState = {
    screen: 'hub',
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: basePlayer(),
    ...state,
  } as GameState

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem(
        'landnam-account-credentials',
        JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }),
      )
    },
  })
}

describe('M3 mission review environment', () => {
  reviewViewports.forEach(({ key, label, width, height }) => {
    it(`reviews the complete handoff at ${label} (${width}x${height})`, () => {
      cy.viewport(width, height)

      visitWithState('/game/landing', {
        screen: 'landing',
        missionId: 'lnm_m3_relay_bennu_vesta',
        targetId: 'bennu',
        player: basePlayer({
          missionPhase: 'landing',
          landingStartedAt: Date.now() - 10_000,
        }),
      })
      cy.get('[data-testid="landing-screen"]', { timeout: 15000 }).should('be.visible')
      cy.contains('TOUCHDOWN CONFIRMED').should('be.visible')
      cy.screenshot(`m3-${key}-01-landing`, { capture: 'viewport' })

      cy.get('[data-testid="landing-continue"]').click()
      cy.get('[data-testid="rover-mining-screen"]', { timeout: 15000 }).should('be.visible')
      cy.contains('ROCKET LANDED · SURVEY THE SITE').should('be.visible')
      cy.screenshot(`m3-${key}-02-rover-survey`, { capture: 'viewport' })

      visitWithState('/game/rover-mining', {
        screen: 'rover-mining',
        missionId: 'lnm_m3_relay_bennu_vesta',
        targetId: 'bennu',
        player: basePlayer({
          missionPhase: 'mining',
          roverTerrainClassifications: { bennu: 'vein' },
          roverMiningStartedAt: Date.now() - 121_000,
        }),
      })
      cy.get('[data-testid="rover-mining-screen"]', { timeout: 15000 }).should('be.visible')
      cy.contains('MINERALS LOADED INTO ROVER').should('be.visible')
      cy.contains('LOAD ROVER AND RETURN TO SHIP').should('be.visible')
      cy.screenshot(`m3-${key}-03-rover-loaded`, { capture: 'viewport' })

      visitWithState('/game/delivery', {
        screen: 'delivery',
        missionId: 'lnm_m3_relay_bennu_vesta',
        targetId: 'bennu',
        deliveryTargetId: 'vesta',
        lastCargo: { iron: 3, carbon: 2 },
        player: basePlayer({
          missionPhase: 'delivery',
          headingToDelivery: true,
          returningToEarth: false,
        }),
      })
      cy.get('[data-testid="delivery-screen"]', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid="delivery-screen"] canvas[aria-label]', { timeout: 15000 }).should('be.visible')
      cy.contains('CLIENT BUILDING SITE').should('be.visible')
      cy.contains('Atlas Aggregate').should('be.visible')
      cy.get('[data-testid="delivery-dump-cargo"]').should('be.visible')
      cy.wait(1200)
      cy.screenshot(`m3-${key}-04-building-site-before-unload`, { capture: 'viewport' })

      cy.get('[data-testid="delivery-dump-cargo"]').click({ force: true })
      cy.contains('MINERALS UNLOADED').should('be.visible')
      cy.contains('Return the empty rover to the ship').should('be.visible')
      cy.get('[data-testid="delivery-return-rover"]').should('be.visible')
      cy.screenshot(`m3-${key}-05-building-site-unloaded`, { capture: 'viewport' })

      cy.get('[data-testid="delivery-return-rover"]').click()
      cy.contains('ROVER REDOCKED').should('be.visible')
      cy.contains('LAUNCH READY').should('be.visible')
      cy.screenshot(`m3-${key}-06-rover-redocked`, { capture: 'viewport' })
      cy.get('.transit-screen', { timeout: 15000 }).should('be.visible')
    })
  })
})
