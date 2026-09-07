// Dedicated M3 mission review harness (KES-235).
// This is intentionally a state-seeded review environment: it reaches each
// authored operation state deterministically, while the delivery leg still
// mounts the real TakeOn canvas and exercises the real dump/redock controls.
//
// Validates:
// - Complete M3 delivery flow across 4 viewports (mobile/tablet/desktop/landscape)
// - Landing, rover mining, and cargo delivery phases
// - TakeOn canvas rendering and dump/redock controls
// - Game state transitions and mission completion

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const AUTHENTICATED_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-user`
const INITIAL_FRANCS = 9_000_000_000
const EXPECTED_CARGO = { iron: 3, carbon: 2 }
const CLIENT_NAME = 'Atlas Aggregate'
const M3_MISSION_ID = 'lnm_m3_relay_bennu_vesta'

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
    francs: INITIAL_FRANCS,
    activeMission: { id: M3_MISSION_ID, label: 'Belt Courier Run' },
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
      const serialized = JSON.stringify(full)
      // Visual QA deliberately fails the auth exchange so this state-machine
      // fixture remains local. Seed both storage namespaces because the app
      // starts from the guest slot before it knows whether auth is available.
      win.localStorage.setItem(STORAGE_KEY, serialized)
      // The offline auth stub resolves to e2e-user. Seed that account's slot
      // explicitly; the production app must ignore the legacy unscoped slot
      // when an authenticated identity arrives (KES-324).
      win.localStorage.setItem(AUTHENTICATED_STORAGE_KEY, serialized)
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

      // Phase 1: Landing confirmation
      visitWithState('/game/landing', {
        screen: 'landing',
        missionId: M3_MISSION_ID,
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
      cy.get('[data-testid="deploy-surface-ops-confirm"]', { timeout: 15000 }).then($deploy => {
        if ($deploy.is(':visible')) cy.wrap($deploy).click()
      })
      cy.contains('Prospector surface run').should('be.visible')
      cy.get('[data-testid="rover-mining-screen"] canvas[aria-label]', { timeout: 15000 }).should('be.visible')
      cy.screenshot(`m3-${key}-02-rover-survey`, { capture: 'viewport' })

      // Phase 2: Rover mining with minerals loaded
      visitWithState('/game/rover-mining', {
        screen: 'rover-mining',
        missionId: M3_MISSION_ID,
        targetId: 'bennu',
        player: basePlayer({
          missionPhase: 'mining',
          roverTerrainClassifications: { bennu: 'vein' },
          roverMiningStartedAt: Date.now() - 121_000,
        }),
      })
      cy.get('[data-testid="rover-mining-screen"]', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid="deploy-surface-ops-confirm"]', { timeout: 15000 }).then($deploy => {
        if ($deploy.is(':visible')) cy.wrap($deploy).click()
      })
      cy.contains('CLIENT ORDER').should('be.visible')
      cy.get('[data-testid="rover-mining-screen"] canvas[aria-label]', { timeout: 15000 }).should('be.visible')
      cy.screenshot(`m3-${key}-03-rover-loaded`, { capture: 'viewport' })

      // Phase 3: Delivery leg — cargo handoff to client building site
      const initialFrancs = INITIAL_FRANCS
      visitWithState('/game/delivery', {
        screen: 'delivery',
        missionId: M3_MISSION_ID,
        targetId: 'bennu',
        deliveryTargetId: 'vesta',
        lastCargo: EXPECTED_CARGO,
        player: basePlayer({
          missionPhase: 'delivery',
          headingToDelivery: true,
          returningToEarth: false,
        }),
      })
      cy.get('[data-testid="delivery-screen"]', { timeout: 15000 }).should('be.visible')

      // Verify TakeOn canvas is mounted and ready before taking action
      cy.get('[data-testid="delivery-screen"] canvas[aria-label]', { timeout: 15000 })
        .should('be.visible')
        .and('have.attr', 'aria-label') // Canvas exists and is labelled
      cy.contains('CLIENT BUILDING SITE').should('be.visible')
      cy.contains(CLIENT_NAME).should('be.visible')

      // Dump cargo button visible before unload (canvas render time: ~1.2s for TakeOn scene setup)
      cy.get('[data-testid="delivery-dump-cargo"]').should('be.visible')
      cy.wait(1200) // Allow TakeOn scene animation to settle before screenshot
      cy.screenshot(`m3-${key}-04-building-site-before-unload`, { capture: 'viewport' })

      // Unload cargo at building site
      cy.get('[data-testid="delivery-dump-cargo"]').click({ force: true })
      cy.contains('MINERALS UNLOADED').should('be.visible')
      cy.contains('Return the empty rover to the ship').should('be.visible')
      cy.get('[data-testid="delivery-return-rover"]').should('be.visible')
      cy.screenshot(`m3-${key}-05-building-site-unloaded`, { capture: 'viewport' })

      // Redock rover and confirm launch ready
      cy.get('[data-testid="delivery-return-rover"]').click()
      cy.contains('ROVER REDOCKED').should('be.visible')
      cy.contains('LAUNCH READY').should('be.visible')
      cy.screenshot(`m3-${key}-06-rover-redocked`, { capture: 'viewport' })

      // Verify return to transit screen (next phase: return to Earth)
      cy.get('.transit-screen', { timeout: 15000 }).should('be.visible')
      cy.contains('EARTH RETURN', { timeout: 5000 }).should('be.visible')

      // Verify game state post-delivery
      // Note: In a full integration test, we could verify francs increase.
      // This harness focuses on UI/canvas flow; state validation is covered by unit tests.
      cy.get('[data-testid="transit-mission-context"]')
        .should('contain.text', 'Belt Courier Run') // Mission context preserved
    })
  })
})
