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

    // KES-329/330 replaced the single aggregate OPS button with the
    // launchpad mission menu's explicit operation choices. The catalog
    // loads async, so proving the screen resolved its own-program set means
    // the menu's operation buttons are enabled once opened (same fixture as
    // the "own-program mission selector" test below, which asserts the same
    // three buttons for this exact save).
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-new-mission-menu"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]').should('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-mining-btn"]').should('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-build-btn"]').should('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-contracts-btn"]').should('be.visible')
  })

  it('keeps M1 on client contracts and hides future monitoring infrastructure', () => {
    cy.viewport(390, 844)
    visitLaunchpad(m1Save())

    // KES-329/330: the standalone "view contracts" button was folded into
    // the launchpad mission menu (onViewContracts is now wired only to
    // launchpad-new-mission-contracts-btn). At M1 (freeOperations: false),
    // the satellite/mining/build operation choices are all disabled and
    // "AVAILABLE CONTRACTS" is the only live path — preserving this test's
    // original contract that M1 keeps the player on client contracts.
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-new-mission-menu"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]').should('be.disabled')
    cy.get('[data-testid="launchpad-new-mission-mining-btn"]').should('be.disabled')
    cy.get('[data-testid="launchpad-new-mission-build-btn"]').should('be.disabled')
    cy.get('[data-testid="launchpad-new-mission-contracts-btn"]').should('be.visible').and('not.be.disabled')
    cy.get('[data-testid="launchpad-monitoring-structure"]').should('not.exist')
    cy.get('[data-testid="launchpad-build-monitoring-btn"]').should('not.exist')
  })

  it('every listed launch is the player’s own, never a client request', () => {
    cy.viewport(1280, 900)
    visitLaunchpad(freeOpsSave())

    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-new-mission-menu"]', { timeout: 15000 }).should('be.visible')
    // KES-329/330: the own-program set is now three explicit operation
    // choices (satellite / mining / build) rather than one aggregate
    // button. Client-attribution copy on any of them would mean the
    // ownership partition leaked a contract into the player's own program.
    // ("AVAILABLE CONTRACTS" legitimately mentions clients and is excluded.)
    for (const testid of ['launchpad-new-mission-satellite-btn', 'launchpad-new-mission-mining-btn', 'launchpad-new-mission-build-btn']) {
      cy.get(`[data-testid="${testid}"]`).invoke('text').should(text => {
        expect(text).not.to.match(/client'?s\b/i)
      })
    }
  })

  it('clicking the physical launchpad opens the own-program mission selector', () => {
    cy.viewport(390, 844)
    visitLaunchpad(freeOpsSave(), false)

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
    cy.get('[data-testid="launchpad-ui-focus-pad-btn"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-focus-screen"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-new-mission-menu"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]').should('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-mining-btn"]').should('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-build-btn"]').should('not.be.disabled')
    cy.contains('Client contracts remain on the Mission Board.').should('be.visible')
    cy.contains('Pick Target').should('not.exist')
  })

  it('hides the onboarding coach while the mission selector is open', () => {
    cy.viewport(1280, 900)
    visitLaunchpad(m1Save())

    cy.get('[data-testid="tutorial-coach-block"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-new-mission-menu"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="tutorial-coach-block"]').should('not.exist')
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
