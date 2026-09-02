// Own-program operations remain explicit Launchpad actions. The physical pad
// itself enters mission selection first, so it never silently chooses the
// first generated operation and drops the player into target selection.
describe('Launchpad · your own program', () => {
  const freeOpsSave = (extra: Record<string, unknown> = {}) => ({
    screen: 'launchpad',
    tutorial: false,
    player: {
      missionsDone: 6,
      freeOperations: true,
      francs: 50_000_000,
      placed: ['launchpad', 'transit-telescope'],
      ...extra,
    },
  })

  const m1Save = () => ({
    screen: 'launchpad',
    tutorial: true,
    player: {
      missionsDone: 0,
      freeOperations: false,
      francs: 50_000_000,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
    },
  })

  const visitLaunchpad = (save: object, authenticated = true) => {
    cy.visit('/game/launchpad', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify(save))
        // Pre-ack the first-visit Launchpad guide (LaunchpadScreen.tsx) —
        // unset, it auto-opens on mount and its close/step transitions
        // reflow the scene mid-test, which flakes clicks on the sticky
        // action rail underneath (page-updated-while-executing races).
        win.localStorage.setItem('landnam-launchpad-guide-v1', 'complete')
        if (authenticated) {
          // Keep the mandatory guest-auth sheet from covering surface
          // assertions. The final test opts out to exercise that flow.
          win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
            email: 'e2e@example.com', password: 'e2e-guest-test',
          }))
        }
      },
    })
  }

  it('lists own-initiative launches and offers the contracts board', () => {
    cy.viewport(390, 844)
    visitLaunchpad(freeOpsSave())

    // The catalog loads async, so the OPS button's count is what proves the
    // screen resolved its own-program set — not just that the shell
    // rendered. The launchpad no longer lists each own mission as a
    // separate card (see git history); it surfaces the next own operation
    // via a single aggregate entry point instead.
    cy.get('[data-testid="launchpad-program-operation-btn"]', { timeout: 15000 })
      .should('be.visible')
      .invoke('text')
      .should('match', /OPS\s+[1-9]\d*/)

    cy.get('[data-testid="launchpad-view-contracts-btn"]').should('be.visible')
  })

  it('keeps M1 on client contracts and hides future monitoring infrastructure', () => {
    cy.viewport(390, 844)
    visitLaunchpad(m1Save())

    cy.get('[data-testid="launchpad-view-contracts-btn"]', { timeout: 15000 })
      .should('be.visible')
      .and('have.class', 'is-primary')
    cy.get('[data-testid="launchpad-monitoring-structure"]').should('not.exist')
    cy.get('[data-testid="launchpad-build-monitoring-btn"]').should('not.exist')
    cy.get('[data-testid="launchpad-program-operation-btn"]').should('not.exist')
  })

  it('every listed launch is the player’s own, never a client request', () => {
    cy.viewport(1280, 900)
    visitLaunchpad(freeOpsSave())

    cy.get('[data-testid="launchpad-program-operation-btn"]', { timeout: 15000 })
      .should('exist')
      .invoke('text')
      .should(text => {
        // Client-attribution copy on this screen would mean the ownership
        // partition leaked a contract into the player's own program.
        expect(text).not.to.match(/client'?s\b/i)
      })
  })

  it('clicking the physical launchpad opens mission selection before targets', () => {
    cy.viewport(390, 844)
    visitLaunchpad(freeOpsSave(), false)

    cy.get('[data-testid="launchpad-program-operation-btn"]', { timeout: 15000 }).should('exist')
    // The auth gate overlays the whole screen on a fresh visit and covers
    // the scene; get past it (email required, KES-97) before clicking the pad.
    // This fixture deliberately has no stored credentials, so the mandatory
    // email gate must be handled before the launchpad action. Waiting directly
    // for the gate avoids resolving the CTA first and then racing its async
    // mount/removal (KES-135).
    cy.get('[data-testid="auth-gate-quick-email"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="auth-gate-quick-email"]').type(`cy-launchpad-${Date.now()}@example.com`)
    cy.get('[data-testid="auth-gate-quick-submit"]').click()
    cy.get('[data-testid="auth-gate-quick-email"]', { timeout: 15000 }).should('not.exist')
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).should('be.visible').click()
    cy.get('body').then($body => {
      // A URL/direct-save entry can first land in the full Launchpad overview;
      // its status card enters the close pad composition. Hub-originated play
      // is already in that composition, so only click a second time when it
      // is actually present.
      if ($body.find('[data-testid="launchpad-focus-screen"]').length) {
        cy.get('[data-testid="launchpad-status-card"]').click()
      }
    })
    cy.contains('Mission Board', { timeout: 15000 }).should('be.visible')
    cy.contains('Pick Target').should('not.exist')
  })

  it('returns to the Launchpad after opening the Hangar from it', () => {
    cy.viewport(1280, 900)
    visitLaunchpad(freeOpsSave())

    cy.get('[data-testid="launchpad-ui-open-hangar-btn"], [data-testid="launchpad-open-hangar-btn"]', { timeout: 15000 })
      .first()
      .click()
    cy.contains('Rocket Fleet', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="top-bar-back"]').click()
    cy.contains('Your Program', { timeout: 15000 }).should('be.visible')
  })
})
