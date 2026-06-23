// Full M1 tutorial flow tests.
//
// These tests actually PLAY the game — they navigate by clicking what the coach
// points to, not by injecting pre-built state for every screen. Running at both
// portrait and desktop viewports catches layout bugs like coach spots pointing to
// the wrong coordinates when the canvas is wider than 390 px.

const STORAGE_KEY = 'landnam-game-state-v1'

function hubState() {
  return {
    screen: 'hub',
    player: {
      francs: 9_500_000_000,
      activeMission: null,
      missionCount: 1,
      pendingLaunch: false,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      controlBuilt: false,
      missionsDone: 0,
      freeOperations: false,
      contractorMissions: {},
      contractorCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: true,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  }
}

function visitHub(win: Window) {
  win.localStorage.setItem(STORAGE_KEY, JSON.stringify(hubState()))
  win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
}

const VIEWPORTS = [
  { label: 'mobile', w: 390, h: 844 },
  { label: 'desktop', w: 1280, h: 800 },
] as const

// ─── Coach spot alignment ──────────────────────────────────────────────────────

VIEWPORTS.forEach(({ label, w, h }) => {
  describe(`Coach spot alignment — ${label} (${w}×${h})`, () => {
    beforeEach(() => cy.viewport(w, h))

    it('spot on nav-toggle overlaps the button (menu closed)', () => {
      cy.visit('/game', { onBeforeLoad: visitHub })
      cy.get('[data-testid="tutorial-coach-block"]', { timeout: 10000 }).should('be.visible')

      // Capture button rect once it's stable, then assert the spot overlaps using .should()
      // which retries until the assertion passes (handles React render timing).
      cy.get('[data-testid="radial-nav-toggle"]').should('be.visible').then($btn => {
        const b = $btn[0].getBoundingClientRect()
        cy.get('[data-testid="tutorial-coach-spot"]').should($spot => {
          const s = $spot[0].getBoundingClientRect()
          expect(s.left, 'spot left < btn right').to.be.lessThan(b.right)
          expect(s.right, 'spot right > btn left').to.be.greaterThan(b.left)
          expect(s.top, 'spot top < btn bottom').to.be.lessThan(b.bottom)
          expect(s.bottom, 'spot bottom > btn top').to.be.greaterThan(b.top)
        })
      })
    })

    it('spot on MISSIONS button overlaps the button (menu open)', () => {
      cy.visit('/game', { onBeforeLoad: visitHub })
      cy.get('[data-testid="radial-nav-toggle"]', { timeout: 10000 }).click()
      cy.get('[data-testid="radial-nav-missions"]').should('be.visible')

      // Both rects are captured inside .should() so the assertion retries as a unit.
      // This waits for the MISSIONS button's CSS transform animation to finish (~400ms)
      // before the overlap check passes — capturing the button in .then() would lock in
      // a mid-animation rect that doesn't match the final position.
      cy.get('[data-testid="tutorial-coach-spot"]').should($spot => {
        const s = $spot[0].getBoundingClientRect()
        const btn = Cypress.$('[data-testid="radial-nav-missions"]')[0]
        const b = btn.getBoundingClientRect()
        expect(s.left, 'spot left < missions btn right').to.be.lessThan(b.right)
        expect(s.right, 'spot right > missions btn left').to.be.greaterThan(b.left)
        expect(s.top, 'spot top < missions btn bottom').to.be.lessThan(b.bottom)
        expect(s.bottom, 'spot bottom > missions btn top').to.be.greaterThan(b.top)
      })
    })
  })
})

// ─── Shared M1 play-through steps ─────────────────────────────────────────────

function playM1() {
  // Hub → open radial nav
  cy.get('[data-testid="radial-nav-toggle"]', { timeout: 10000 }).click()

  // Radial nav → tap MISSIONS
  cy.get('[data-testid="radial-nav-missions"]').click()
  cy.contains('Mission Board', { timeout: 8000 }).should('be.visible')

  // Mission board → pick M1
  cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').click()

  // Target picker → pick Mars, then confirm
  cy.contains('Pick Target', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="target-mars"]').click()
  cy.contains('Continue').click() // "Continue · Build →" button appears after target pick

  // Rocket purchase — SR1 is free so button says "Launch with Starter Rocket 1"
  cy.contains('Select Rocket', { timeout: 8000 }).should('be.visible')
  cy.contains('Launch with Starter Rocket 1').click()

  // Assembly → confirm launch
  cy.get('[data-testid="launch-btn"]', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="launch-btn"]').click()

  // M1 uses fake transit (missionsDone < 3 → arrivalAt is null).
  // Fake progress auto-advances to 100% in real time (~5s) then onArrive fires.
  // Do NOT use cy.clock() here: the React state updates from setInterval callbacks
  // schedule the onArrive setTimeout AFTER cy.tick() returns, causing it to never fire.
  cy.contains('MISSION TRANSIT', { timeout: 8000 }).should('be.visible')

  // Mining — fire laser 5 times to deplete it; when charges hit 0 the game auto-calls
  // onComplete → onMiningDone which navigates to debrief.
  // Longer timeout: fake transit takes ~5s in real time before auto-arriving.
  cy.get('[data-testid="mining-canvas"]', { timeout: 15000 }).should('be.visible')
  // Each click asserts not-disabled first to wait for React re-render between fires.
  cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
  cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
  cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
  cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
  cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
  // After the 5th click laserCharges=0; alternatively, the enabled return-home-btn appears.
  // Click it explicitly in case the useEffect auto-complete doesn't fire in test environment.
  cy.get('[data-testid="return-home-btn"]').should('not.be.disabled').click()

  // Debrief — resolve then collect
  cy.contains('MISSION COMPLETE', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="resolve-cargo-btn"]').click()
  cy.contains('Francs Earned').should('be.visible')
  cy.get('[data-testid="collect-reward-btn"]').click()

  // Market screen appears after M1 completion
  cy.contains('Commodity Exchange', { timeout: 8000 }).should('be.visible')
}

// ─── Full M1 flow (desktop — the viewport that previously broke) ───────────────

describe('M1 full tutorial flow — desktop (1280×800)', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('plays M1 from hub through market at desktop width', () => {
    cy.visit('/game', { onBeforeLoad: visitHub })
    cy.get('[data-testid="tutorial-coach-block"]', { timeout: 10000 }).should('be.visible')
    playM1()
  })
})

// ─── Full M1 flow (mobile — regression guard) ─────────────────────────────────

describe('M1 full tutorial flow — mobile (390×844)', () => {
  beforeEach(() => cy.viewport(390, 844))

  it('plays M1 from hub through market at mobile width', () => {
    cy.visit('/game', { onBeforeLoad: visitHub })
    cy.get('[data-testid="tutorial-coach-block"]', { timeout: 10000 }).should('be.visible')
    playM1()
  })
})
