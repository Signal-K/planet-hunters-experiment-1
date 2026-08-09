const STORAGE_KEY = 'landnam-game-state-v1'

function seedState(win: Window, player: Record<string, unknown>, screen = 'hub') {
  win.localStorage.setItem('ln_tutorial_complete_ack', '1')
  // The offline auth stub in cypress/support/e2e.ts always resolves to an
  // @landnam.guest email regardless of what dismissAuthGate() submits, which
  // otherwise trips the mandatory (non-dismissible) SaveProgressPrompt and
  // covers the surface-ops UI. See tutorial-m1.cy.ts's suppressSurveys().
  win.localStorage.setItem('landnam-upgrade-prompt-snooze-until', String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  win.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    screen,
    tutorial: false,
    player: {
      francs: 30_000_000,
      activeMission: null,
      missionCount: 5,
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
      stash: { aluminium: 20, silicon: 20 },
      // The "Surface Ops" hub button (hub-surface-ops) only renders once the
      // player has landed on a body (HubScreen.tsx: `player.hasLanded &&`) --
      // without this the button doesn't exist in the DOM at all, which reads
      // like a stale/removed selector but is actually a gating precondition.
      hasLanded: true,
      ...player,
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  }))
}

function dismissAuthGate() {
  cy.get('[data-testid="auth-gate-quick-email"]', { timeout: 15000 }).type(`cy-surface-ops-${Date.now()}@example.com`)
  cy.get('[data-testid="auth-gate-quick-submit"]').click()
  cy.get('[data-testid="auth-gate-quick-email"]').should('not.exist')
}

describe('Surface Ops settlement journey', () => {
  it('navigates from Earth Base, purchases rights, and starts launchpad construction', () => {
    cy.viewport(390, 844)
    cy.visit('/game/hub', {
      onBeforeLoad: win => seedState(win, {}),
    })
    // No stored session/credentials are seeded, so the auth gate opens on a
    // brand-new visitor (STS-624: the gameplay screen underneath doesn't
    // mount at all until the gate resolves) -- it must be dismissed before
    // any hub element can be asserted visible, not after.
    dismissAuthGate()
    cy.get('[data-testid="hub-surface-ops"]', { timeout: 15000 }).should('be.visible')

    cy.get('[data-testid="hub-surface-ops"]').click()
    cy.location('pathname').should('eq', '/game/surface-ops')
    cy.get('[data-testid="surface-purchase-rights"]').click()
    cy.contains('RIGHTS RECORD ACTIVE').should('be.visible')
    cy.get('[data-testid="surface-build-launchpad"]').click()
    cy.contains('CONSTRUCTION ACTIVE').should('be.visible')
    cy.screenshot('surface-ops-portrait-building')
  })

  it('dispatches one ready cargo manifest through an operational settlement pad', () => {
    const now = Date.now()
    cy.viewport(1280, 900)
    cy.visit('/game/surface-ops', {
      onBeforeLoad: win => seedState(win, {
        surfaceOps: {
          sites: {
            'moon-south-pole': {
              rightsPurchasedAt: now - 100_000,
              launchpad: {
                pad: 1,
                startedAt: now - 2_000_000,
                completesAt: now - 1_000,
              },
              storage: { iron: 12, silicon: 8 },
            },
          },
        },
      }, 'surface-ops'),
    })
    cy.get('[data-testid="surface-dispatch-ferry"]', { timeout: 15000 }).should('be.visible')
    dismissAuthGate()

    cy.get('[data-testid="surface-dispatch-ferry"]').click()
    cy.contains('FERRY IN FLIGHT').should('be.visible')
    cy.get('[data-testid="surface-dispatch-ferry"]').should('not.exist')
    cy.get('[data-ui-zone="toast-stack"]')
      .contains('Automated cargo ferry dispatched.')
      .should('have.length', 1)
      .click()
    // `main`'s two-column operationsGrid (siteVisualPanel canvas + shorter
    // controlStack aside) means scrollTo('bottom') overshoots past the
    // cargo/ferry panel once the taller canvas column keeps scrolling below
    // it -- scroll the actual panel into view instead of the container edge.
    cy.get('[data-testid="surface-cargo-panel"]').scrollIntoView()
    cy.contains('FERRY IN FLIGHT').should('be.visible')
    cy.screenshot('surface-ops-desktop-ferry')
  })
})

export {}
