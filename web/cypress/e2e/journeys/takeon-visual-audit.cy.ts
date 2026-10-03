// Visual audit coverage for the actual Takeon-rendered gameplay (KES-audit,
// 2026-08-19). Landnam consumes signal-k/takeon (web/vendor/takeon,
// @takeon/engine + @takeon/pixi) as the voxel/isometric rover renderer for
// two real player-facing surfaces:
//   1. Surface Ops "FIELD" tab (SurfaceOpsScreen.tsx) — post-onboarding,
//      gated on freeOperations + hasLanded + site access purchased.
// The current product scope is the post-onboarding Surface Ops FIELD scene.
// The retired M3 delivery leg is deliberately not an acceptance target.
// Neither had Cypress coverage before this file: the existing
// surface-ops-settlement.cy.ts journey never leaves the default "LOGISTICS"
// tab, and no spec anywhere seeds missionsDone: 2 into /game/delivery. Both
// screenshots below are the first real evidence of what the vendored takeon
// renderer actually looks like inside this app's stack, not just that it
// compiles (see components/takeon-preview/TakeonEngineDemo.tsx, which is a
// standalone dev-only proof with zero connection to real game state).
//
// KES-201: the canvas rendered solid black on all three surfaces until
// @takeon/pixi was fixed and re-vendored to 0.2.1 — these screenshots now
// show the real, working render. KES-202: with the render fixed, the FIELD
// tab's composition could finally be judged for real; the mobile-viewport
// test below is the reproducible geometry check that finding asked for.

import type { GameState } from '@/game-context'
import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 9_000_000_000,
    activeMission: null,
    missionCount: 4,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 4,
    freeOperations: true,
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

  const tokenPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  const e2eToken = `e30.${tokenPayload}.test`
  // Override the generic offline failure stubs: this routed-screen fixture
  // needs auth restoration to settle successfully before the URL synchroniser
  // applies /game/surface-ops to the account-scoped state.
  cy.intercept('POST', '**/api/collections/users/auth-refresh', {
    statusCode: 200,
    body: { token: e2eToken, record: { id: 'e2e-fixture-user', email: 'e2e-fixture-user@example.com' } },
  })
  cy.intercept('POST', '**/api/landnam-auth/exchange', {
    statusCode: 200,
    body: { token: e2eToken, record: { id: 'e2e-fixture-user' } },
  })

  cy.visit(path, {
    onBeforeLoad(win) {
      // The live route shell reads the account-scoped save slot. A synthetic
      // PocketBase session alone can pass the entry gate yet resume to Hub,
      // leaving this test to inspect the wrong surface.
      seedAuthenticatedFixture(win, full)
    },
  })
}

describe('Takeon visual audit: actual rendered gameplay, not just presence', () => {
  it('renders the Takeon rover canvas in Surface Ops FIELD view', () => {
    cy.viewport(1280, 900)
    visitWithState('/game/hub', {
      screen: 'hub',
      player: basePlayer({
        freeOperations: true,
        hasLanded: true,
        stash: { aluminium: 20, silicon: 20 },
        // surfaceOps lives on Player (lib/game-types.ts), not top-level
        // GameState — misplacing it silently no-ops siteAccessPurchasedAt
        // and leaves the purchase-access button stuck on screen.
        surfaceOps: {
          sites: {
            'moon-south-pole': {
              siteAccessPurchasedAt: Date.now() - 100_000,
              storage: {},
            },
          },
        },
      }),
    } as Partial<GameState>)

    cy.get('[data-testid="hub-surface-ops"]', { timeout: 15000 }).should('be.visible').click({ force: true })
    cy.get('[data-testid="surface-purchase-access"]', { timeout: 15000 }).should('not.exist')
    cy.contains('button[role="tab"]', 'FIELD', { timeout: 15000 }).should('not.be.disabled').click()
    cy.contains('button', 'Deploy Prospector', { timeout: 15000 }).click()
    cy.get('[data-testid="surface-field-view"]', { timeout: 15000 }).should('be.visible')
    cy.window().then(win => {
      cy.get('[data-testid="surface-field-view"] canvas[aria-label]', { timeout: 15000 })
        .should('be.visible')
        .then($canvas => {
          const rect = $canvas[0].getBoundingClientRect()
          expect(rect.bottom, 'desktop canvas bottom').to.be.at.most(win.innerHeight - 8)
        })
    })
    cy.get('[data-testid="surface-field-route-readout"]')
      .should('contain.text', 'TAP TERRAIN TO PLAN')
    cy.get('[data-testid="surface-field-view"] canvas[aria-label]').click('center', { force: true })
    cy.wait(500)
    // Let PIXI actually paint a frame (ready/init is async) before capturing.
    cy.wait(1500)
    cy.screenshot('takeon-surface-ops-field-view')
  })

  it('keeps the Surface Ops FIELD canvas within the first mobile viewport (KES-202)', () => {
    cy.viewport(390, 844)
    visitWithState('/game/hub', {
      screen: 'hub',
      player: basePlayer({
        freeOperations: true,
        hasLanded: true,
        stash: { aluminium: 20, silicon: 20 },
        surfaceOps: {
          sites: {
            'moon-south-pole': {
              siteAccessPurchasedAt: Date.now() - 100_000,
              storage: {},
            },
          },
        },
      }),
    } as Partial<GameState>)

    cy.get('[data-testid="hub-surface-ops"]', { timeout: 15000 }).should('be.visible').click({ force: true })
    cy.get('[data-testid="surface-purchase-access"]', { timeout: 15000 }).should('not.exist')
    cy.contains('button[role="tab"]', 'FIELD', { timeout: 15000 }).should('not.be.disabled').click()
    cy.contains('button', 'Deploy Prospector', { timeout: 15000 }).click()
    cy.window().then(win => {
      cy.get('[data-testid="surface-field-view"] canvas[aria-label]', { timeout: 15000 })
        .should('be.visible')
        .then($canvas => {
          // The whole point of the FIELD tab is the canvas — a player
          // shouldn't have to scroll a full screen to see any gameplay after
          // tapping it. KES-202 found the heading + copy block above it
          // pushing the canvas below the usable viewport; retain at least a
          // 160px slice of actual TakeOn terrain in the first view.
          const top = $canvas[0].getBoundingClientRect().top
          expect(top, 'canvas top offset, no scroll').to.be.lessThan(win.innerHeight - 160)
        })
    })
    cy.get('[data-testid="sandbox-palette-toggle"]', { timeout: 15000 }).click()
    cy.get('[data-testid="sandbox-palette"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="sandbox-palette"] [data-testid="sandbox-recipe-name"]').each($name => {
      const style = getComputedStyle($name[0])
      expect(parseFloat(style.fontSize), 'off-world card name font size').to.be.at.least(12)
      expect($name[0].scrollWidth, 'off-world card name has no horizontal glyph clipping').to.be.at.most($name[0].clientWidth)
    })
    cy.wait(1500)
    cy.screenshot('takeon-surface-ops-field-view-mobile')
  })

})

export {}
