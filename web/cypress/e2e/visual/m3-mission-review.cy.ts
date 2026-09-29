// Dedicated Transport lesson review harness (KES-235; the old M3 relay became
// the SSL-362 courier job, so there is no landing or rover-mining phase).
// Opt-in: CYPRESS_PROFILE=visual-extended. Not part of the per-push Visual QA
// playthrough (SSL-294).
// This is intentionally a state-seeded review environment: it reaches each
// authored operation state deterministically, while the delivery leg still
// mounts the real TakeOn canvas and exercises the real dump/redock controls.
//
// Validates:
// - Complete Transport courier delivery across 4 viewports (mobile/tablet/desktop/landscape)
// - Cargo delivery at the client depot
// - TakeOn canvas rendering and dump/redock controls
// - Game state transitions and mission completion

import type { GameState } from '@/game-context'
import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

const INITIAL_FRANCS = 9_000_000_000
const EXPECTED_CARGO = { iron: 3, carbon: 2 }
const CLIENT_NAME = 'Atlas Aggregate'
const M3_MISSION_ID = 'lnm_transport_courier_vesta'

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
    activeMission: { id: M3_MISSION_ID, label: 'Vesta Depot Run' },
    missionCount: 2,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 1,
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
      // Seed the same authenticated identity that owns the account-scoped
      // state. A credentials-only fixture leaves the current shell anonymous
      // after its deliberate offline refresh failure, so it ignores this run.
      seedAuthenticatedFixture(win, full, 'e2e-user')
    },
  })
}

describe('Transport lesson review environment', () => {
  reviewViewports.forEach(({ key, label, width, height }) => {
    it(`reviews the complete handoff at ${label} (${width}x${height})`, () => {
      cy.viewport(width, height)

      // Delivery — the hold was loaded on Earth; hand the cargo to the client depot
      const initialFrancs = INITIAL_FRANCS
      visitWithState('/game/delivery', {
        screen: 'delivery',
        missionId: M3_MISSION_ID,
        targetId: 'vesta',
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
      cy.contains('CLIENT BUILD SITE').should('be.visible')
      cy.contains(CLIENT_NAME).should('be.visible')

      // Dump cargo button visible before unload (canvas render time: ~1.2s for TakeOn scene setup)
      cy.get('[data-testid="delivery-dump-cargo"]').should('be.visible')
      cy.wait(1200) // Allow TakeOn scene animation to settle before screenshot
      cy.screenshot(`m3-${key}-01-building-site-before-unload`, { capture: 'viewport' })

      // Unload cargo at building site
      cy.get('[data-testid="delivery-dump-cargo"]').click({ force: true })
      cy.contains('MINERALS UNLOADED').should('be.visible')
      cy.contains('Return the empty Mule rover to the ship').should('be.visible')
      cy.get('[data-testid="delivery-return-rover"]').should('be.visible').and('contain.text', 'Return Rover To Ship')
      cy.screenshot(`m3-${key}-02-building-site-unloaded`, { capture: 'viewport' })

      // Redock rover and confirm launch ready
      cy.get('[data-testid="delivery-return-rover"]').click()
      cy.contains('ROVER REDOCKED').should('be.visible')
      cy.contains('LAUNCH READY').should('be.visible')
      cy.screenshot(`m3-${key}-03-rover-redocked`, { capture: 'viewport' })

      // The courier handoff settles into Debrief after redock. Verify the real
      // client completion state, then finish the explicit teardown/reward path.
      cy.get('.debrief-game', { timeout: 15000 }).should('be.visible')
      cy.contains('MISSION COMPLETE').should('be.visible')
      cy.contains('Vesta Depot Run').should('be.visible')
      cy.get('[data-testid="resolve-cargo-btn"]').should('be.visible').click()
      cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).should('be.visible').click()
      cy.get('[data-testid="collect-reward-btn"]', { timeout: 10000 }).should('be.visible').click()
      cy.contains('h1', /^(Base|Earth Base)$/i, { timeout: 15000 }).should('be.visible')
    })
  })
})
