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
      },
    })
  }

  it('lists own-initiative launches and offers the contracts board', () => {
    cy.viewport(390, 844)
    visitLaunchpad(freeOpsSave())

    // The catalog loads async, so the list is what proves the screen resolved
    // its own-program set — not just that the shell rendered.
    cy.get('[data-testid="launchpad-own-program-list"]', { timeout: 15000 })
      .children()
      .should('have.length.greaterThan', 0)

    cy.get('[data-testid="launchpad-view-contracts-btn"]').should('be.visible')
  })

  it('every listed launch is the player’s own, never a client request', () => {
    cy.viewport(1280, 900)
    visitLaunchpad(freeOpsSave())

    cy.get('[data-testid="launchpad-own-program-list"]', { timeout: 15000 })
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

    cy.get('[data-testid="launchpad-own-program-list"]', { timeout: 15000 }).should('exist')
    // The guest auth gate overlays the whole screen on a fresh visit and covers
    // the sticky actions; dismiss it before asserting on navigation.
    cy.get('body').then($b => {
      if ($b.find('[data-testid="auth-gate-skip"]').length) {
        cy.get('[data-testid="auth-gate-skip"]').click()
      }
    })
    cy.get('[data-testid="launchpad-view-contracts-btn"]').click()
    cy.contains('Mission Board', { timeout: 15000 }).should('be.visible')
  })
})
