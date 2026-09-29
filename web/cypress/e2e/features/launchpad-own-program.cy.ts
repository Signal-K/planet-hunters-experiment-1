// Own-program operations remain explicit Launchpad actions. The physical pad
// itself enters mission selection first, so it never silently chooses the
// first generated operation and drops the player into target selection.
import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

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

  const visitLaunchpad = (save: object) => {
    cy.visit('/game/launchpad', {
      onBeforeLoad(win) {
        seedAuthenticatedFixture(win, save)
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

    // During onboarding (freeOperations: false), the satellite/mining/build
    // operation choices are always disabled placeholders and "AVAILABLE
    // CONTRACTS" is the only live path — so the pad now skips that
    // mostly-dead four-tile menu entirely and takes the player straight to
    // the Mission Board, preserving this test's original contract that M1
    // keeps the player on client contracts (reported as "users are not told
    // what to do" when the dead menu was still shown first).
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-new-mission-menu"]').should('not.exist')
    cy.get('[data-testid="mission-board-section-client"]', { timeout: 15000 }).should('be.visible')
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
    visitLaunchpad(freeOpsSave())

    // This is a Launchpad interaction test. Its account-scoped fixture keeps
    // the independent email/password gate out of the spatial scene contract.
    // /game/launchpad opens the one Launchpad scene directly (the separate
    // overview UI and its "focus pad" button were folded into it).
    cy.get('[data-testid="launchpad-focus-screen"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-new-mission-menu"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]').should('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-mining-btn"]').should('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-build-btn"]').should('not.be.disabled')
    // Client work is one separate entry that leads to the Mission Board.
    cy.get('[data-testid="launchpad-new-mission-contracts-btn"]').should('be.visible')
    cy.contains('Pick Target').should('not.exist')
  })

  it('advances the onboarding coach onto the Mission Board once the pad is used', () => {
    cy.viewport(1280, 900)
    visitLaunchpad(m1Save())

    cy.get('[data-testid="tutorial-coach-block"]', { timeout: 15000 }).should('contain', 'Open a Mission')
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 15000 }).click()
    cy.get('[data-testid="launchpad-new-mission-menu"]').should('not.exist')
    cy.get('[data-testid="mission-board-section-client"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="tutorial-coach-block"]', { timeout: 15000 }).should('contain', 'Select a Mission')
  })

  it('returns to the Launchpad after opening the Hangar from it', () => {
    cy.viewport(1280, 900)
    visitLaunchpad(freeOpsSave())

    // The rocket on the pad is the way into the Hangar.
    cy.get('[data-testid="launchpad-rocket-fleet"]', { timeout: 15000 }).click()
    cy.get('[data-testid="hangar-fleet-readout"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="top-bar-back"]').click()
    cy.get('[data-testid="launchpad-focus-screen"]', { timeout: 15000 }).should('be.visible')
    cy.contains('Your Program').should('be.visible')
  })
})
