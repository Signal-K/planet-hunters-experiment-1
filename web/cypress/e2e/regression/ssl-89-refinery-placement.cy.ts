import type { GameState } from '../../../game-context'
import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

const FIXTURE_USER = 'e2e-fixture-user'
const ACCOUNT_SLOT = `landnam-game-state-v1:user:${FIXTURE_USER}`

// A real (non-preview) save that meets the refinery's prerequisites (Free Ops,
// a Surface Silo, a purchased mining site, materials) but has not placed it,
// so the placement goes through the normal persistence path.
const READY_TO_BUILD: Partial<GameState> = {
  screen: 'hub', tutorial: false, doneSteps: {},
  player: {
    francs: 1_000_000_000, activeMission: null, missionCount: 3,
    pendingLaunch: false, placed: ['launchpad', 'surface-silo'], placementPlots: { launchpad: 0, 'surface-silo': 2 },
    controlBuilt: true, missionsDone: 3, skillPoints: 0, unlockedSkillNodes: [], freeOperations: true,
    clientMissions: {}, clientCooldowns: {}, researchAnnotations: 0,
    refineryBuilt: false, refineryQueue: [], refinedGoods: {}, launchpadUpgraded: false,
    stash: { aluminium: 20, copper: 10 }, loanDebt: 0, loanOffered: false,
    surfaceOps: { sites: { 'mars-arcadia': { storage: {}, siteAccessPurchasedAt: 1 } } },
  },
} as Partial<GameState>

describe('SSL-89 — refinery placement', () => {
  it('places a refinery and returns to the Base after confirmation', () => {
    cy.visit('/game/build?preset=ui-build')

    cy.contains('button', 'Refinery').click()
    cy.get('[data-testid="build-plot-1"]').click()
    cy.contains('button', 'Confirm · Build Here').click()
    cy.get('[data-testid="building-refinery-hit"]', { timeout: 10000 }).should('be.visible')
  })

  it('keeps a placed refinery after a reload', () => {
    // Signing in always lands on the Base, so reach Build through an empty plot.
    cy.visit('/game/hub', { onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
      seedAuthenticatedFixture(win, READY_TO_BUILD, FIXTURE_USER)
    } })

    cy.get('[data-testid="hub-edit-build-btn"]', { timeout: 10000 }).click()
    cy.get('[data-testid="build-plot-1"]').click()
    cy.location('pathname', { timeout: 10000 }).should('eq', '/game/build')
    cy.contains('button', 'Refinery').click()
    cy.get('[data-testid="build-plot-1"]').click()
    cy.contains('button', 'Confirm · Build Here').click()
    cy.get('[data-testid="building-refinery-hit"]', { timeout: 10000 }).should('be.visible')

    cy.reload()
    cy.get('[data-testid="building-refinery-hit"]', { timeout: 10000 }).should('be.visible')
    cy.window().then(win => {
      const saved = JSON.parse(win.localStorage.getItem(ACCOUNT_SLOT) ?? '{}') as GameState
      expect(saved.player.placed).to.include('refinery')
      expect(saved.player.placementPlots?.refinery).to.eq(1)
    })
  })
})
