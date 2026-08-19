// Visual audit coverage for the actual Takeon-rendered gameplay (KES-audit,
// 2026-08-19). Landnam consumes signal-k/takeon (web/vendor/takeon,
// @takeon/engine + @takeon/pixi) as the voxel/isometric rover renderer for
// two real player-facing surfaces:
//   1. Surface Ops "FIELD" tab (SurfaceOpsScreen.tsx) — post-onboarding,
//      gated on freeOperations + hasLanded + site access purchased.
//   2. The M3 tutorial delivery leg's manual cargo-dump scene
//      (DeliveryScreen.tsx, useTakeonDropoff — only rendered when
//      player.missionsDone === 2).
// Neither had any Cypress coverage before this file: the existing
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

const STORAGE_KEY = 'landnam-game-state-v1'

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

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      // Bypasses the auth gate the same way mine-then-deliver-flow.cy.ts
      // does — the offline auth stub in cypress/support/e2e.ts always
      // resolves to this guest identity regardless of the credentials'
      // actual values.
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
    },
  })
}

describe('Takeon visual audit: actual rendered gameplay, not just presence', () => {
  it('renders the Takeon rover canvas in Surface Ops FIELD view', () => {
    cy.viewport(1280, 900)
    visitWithState('/game/surface-ops', {
      screen: 'surface-ops',
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
    visitWithState('/game/surface-ops', {
      screen: 'surface-ops',
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
    cy.wait(1500)
    cy.screenshot('takeon-surface-ops-field-view-mobile')
  })

  it('renders the Takeon dropoff scene during the M3 tutorial delivery leg', () => {
    cy.viewport(390, 844)
    visitWithState('/game/delivery', {
      screen: 'delivery',
      missionId: 'lnm_m3_relay_bennu_vesta',
      targetId: 'bennu',
      deliveryTargetId: 'vesta',
      lastCargo: { iron: 3, carbon: 2 },
      player: basePlayer({
        missionsDone: 2,
        activeMission: { id: 'lnm_m3_relay_bennu_vesta', label: 'Two-Stop Route' },
        missionPhase: 'delivery',
        headingToDelivery: true,
        returningToEarth: false,
      }),
    } as Partial<GameState>)

    cy.get('[data-testid="delivery-screen"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="delivery-screen"] canvas[aria-label]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="delivery-dump-cargo"]', { timeout: 15000 }).should('be.visible')
    cy.wait(1500)
    cy.screenshot('takeon-m3-delivery-dropoff')
  })
})

export {}
