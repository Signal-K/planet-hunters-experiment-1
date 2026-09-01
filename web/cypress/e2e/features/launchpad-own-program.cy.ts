// Tapping the launchpad opens the player's own program first — the work they
// launch on their own initiative — with the Mission Board's client contracts
// one press further in. Before this, the pad went straight to a wall of client
// requests, which read as "this pad exists to serve other people".
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

  it('clicking the launchpad starts the next own-program operation', () => {
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
    cy.contains('Pick Target', { timeout: 15000 }).should('be.visible')
  })
})
