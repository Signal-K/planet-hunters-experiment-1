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
      placed: ['launchpad', 'satellite-monitoring-station'],
      satelliteMonitoringBuilt: true,
      ...extra,
    },
  })

  const visitLaunchpad = (save: object) => {
    cy.visit('/game/launchpad', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify(save))
        // Pre-ack the first-visit Launchpad guide (LaunchpadScreen.tsx) —
        // unset, it auto-opens on mount and its close/step transitions
        // reflow the scene mid-test, which flakes clicks on the sticky
        // action rail underneath (page-updated-while-executing races).
        win.localStorage.setItem('landnam-launchpad-guide-v1', 'complete')
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

  it('the contracts button reaches the Mission Board', () => {
    cy.viewport(390, 844)
    visitLaunchpad(freeOpsSave())

    cy.get('[data-testid="launchpad-program-operation-btn"]', { timeout: 15000 }).should('exist')
    // The auth gate overlays the whole screen on a fresh visit and covers
    // the sticky actions; get past it (email required, KES-97) before
    // asserting on navigation. The gate mounts asynchronously (its own auth
    // check resolves independently of the launchpad scene above), so a bare
    // synchronous `cy.get('body').then(...)` right here can run before it
    // has appeared at all — wait for the DOM to settle into one of its two
    // possible states first, or the check below silently skips the gate and
    // the later click races its mount instead.
    cy.get('[data-testid="auth-gate-quick-email"], [data-testid="launchpad-view-contracts-btn"]', { timeout: 15000 }).should('exist')
    cy.get('body').then($b => {
      if ($b.find('[data-testid="auth-gate-quick-email"]').length) {
        cy.get('[data-testid="auth-gate-quick-email"]').type(`cy-launchpad-${Date.now()}@example.com`)
        cy.get('[data-testid="auth-gate-quick-submit"]').click()
        // The gate's own removal from the DOM is an async re-render that
        // races a click issued right after .click() above — wait for it to
        // fully settle before touching anything else on the scene.
        cy.get('[data-testid="auth-gate-quick-email"]', { timeout: 15000 }).should('not.exist')
      }
    })
    cy.get('[data-testid="launchpad-view-contracts-btn"]', { timeout: 15000 }).should('be.visible').click()
    cy.contains('Mission Board', { timeout: 15000 }).should('be.visible')
  })
})
