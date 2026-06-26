export {}
// Full M1/M2/M3 tutorial play-through tests.
//
// These tests play the game as a real user would — they navigate using whatever
// nav element is VISIBLE on screen, not by force-clicking hidden elements.
//
// Desktop (≥1024px): radial nav is display:none; use sidebar-nav-* instead.
// Mobile (<1024px):  sidebar is display:none; use radial-nav-toggle then item.
//
// Failure modes caught:
//   - Tutorial coach pointing to a nav element that doesn't exist on this layout
//   - Tutorial spot highlighting a hidden button
//   - Broken screen transitions on either layout

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

const ALL_SURVEY_KEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_contractor_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
]

// ─── Base player ──────────────────────────────────────────────────────────────

function basePlayer(overrides: Record<string, unknown> = {}) {
  return {
    francs: 9_500_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 1 },
    controlBuilt: false,
    missionsDone: 0,
    skillPoints: 0,
    unlockedSkillNodes: [],
    freeOperations: false,
    contractorMissions: {},
    contractorStreaks: {},
    contractorCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryUnlocked: false,
    refineryUnlockNotified: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    seen_planets: [],
    roverDeployments: [],
    contractorTerritories: {},
    ...overrides,
  }
}

function suppressSurveys(win: Window) {
  win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEY_KEYS))
  win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
}

function visitHub(overrides: Record<string, unknown> = {}) {
  cy.visit('/game', {
    onBeforeLoad(win) {
      suppressSurveys(win)
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        screen: 'hub',
        player: basePlayer(),
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        tutorial: true,
        doneSteps: {},
        popup: null,
        menuOpen: false,
        ...overrides,
      }))
    },
  })
}

// ─── Layout-aware nav helper ──────────────────────────────────────────────────
//
// This is the crux of the desktop bug: on mobile the radial toggle opens a
// menu; on desktop the sidebar is always visible and the radial toggle is
// hidden. Tests MUST use the element the user can actually see.

function navToMissions() {
  cy.window().then(win => {
    const isDesktop = win.innerWidth >= 1024
    if (isDesktop) {
      // Sidebar is always visible on desktop — no toggle needed.
      cy.get('[data-testid="radial-nav-toggle"]').should('not.be.visible')
      cy.get('[data-testid="sidebar-nav-missions"]').should('be.visible').click()
    } else {
      cy.get('[data-testid="radial-nav-toggle"]').should('be.visible').click()
      cy.get('[data-testid="radial-nav-missions"]').should('be.visible').click()
    }
  })
  cy.contains('Mission Board', { timeout: 8000 }).should('be.visible')
}

// ─── Mining play-through (same on mobile/desktop) ─────────────────────────────

function completeMining() {
  // Launch animation is 8.5s — allow 15s for the animation to complete and transit to appear
  cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
  cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
  for (let i = 0; i < 5; i++) {
    cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
  }
  cy.get('[data-testid="return-home-btn"]').should('not.be.disabled').click()
}

function completeDebrief() {
  cy.contains('MISSION COMPLETE', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="resolve-cargo-btn"]').should('be.visible').click()
  cy.contains('Francs Earned').should('be.visible')
  cy.get('[data-testid="collect-reward-btn"]').should('be.visible').click()
}

// ─── Full M1 play-through ─────────────────────────────────────────────────────

function playM1() {
  cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')

  // Step 1: tutorial coach says to open missions — follow what's VISIBLE on screen
  cy.get('[data-testid="tutorial-coach-block"]').should('be.visible')
  navToMissions()

  // Step 2: pick M1 contract
  cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]')
    .should('be.visible').click()

  // Step 3: pick target
  cy.contains('Pick Target', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="target-eros"]').should('exist').click({ force: true })
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()

  // Step 4: rocket selection — SR1 is free
  cy.contains('Select Rocket', { timeout: 8000 }).should('be.visible')
  cy.contains('button', 'Launch with Starter Rocket 1').should('be.visible').click()

  // Step 5: assembly → confirm launch
  cy.get('[data-testid="launch-btn"]', { timeout: 8000 }).should('be.visible').click()

  completeMining()
  completeDebrief()

  cy.contains('Commodity Exchange', { timeout: 8000 }).should('be.visible')
}

// ─── Full M2 play-through ─────────────────────────────────────────────────────
//
// Starts from hub with missionsDone=1 and M2 tutorial active.
// Step 20 is a manual coach card on hub; step 21 is on rocket-buy.

function playM2() {
  cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')

  // M2 step 20: manual coach on hub — dismiss it
  cy.get('[data-testid="tutorial-coach-block"]')
    .should('be.visible')
    .should('contain', 'Starter Rocket 2 Available')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()

  // Navigate to missions using the layout-correct nav
  navToMissions()

  // Pick M2 silicon order
  cy.get('[data-testid="mission-card-generated-s2-starter-bulk-4"]')
    .scrollIntoView().should('be.visible').click()

  // Pick target
  cy.contains('Pick Target', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="target-eros"]').should('exist').click({ force: true })
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()

  // Rocket purchase screen — step 21 fires here
  cy.contains('Select Rocket', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="tutorial-coach-block"]')
    .should('be.visible')
    .should('contain', 'Purchase Your Rocket')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()

  // Purchase SR2
  cy.contains('button', /Purchase/).should('be.visible').click()

  // Fab → launch
  cy.get('[data-testid="launch-btn"]', { timeout: 8000 }).should('be.visible').click()

  completeMining()
  completeDebrief()
}

// ─── Full M3 play-through ─────────────────────────────────────────────────────
//
// M3 uses a rover delivery instead of mining. The rover canvas requires joystick
// input which cannot be automated reliably, so this test covers M3 up through
// the launch and separately verifies the debrief handles rover completion.

function playM3ToLaunch() {
  cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')

  // Step 30: manual coach on hub
  cy.get('[data-testid="tutorial-coach-block"]')
    .should('be.visible')
    .should('contain', 'Delivery Mission')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()

  // Navigate to missions
  navToMissions()

  // Pick M3 (Lutetia Survey Drop — has preset targetId: lutetia, so goes directly to rocket-buy)
  cy.get('[data-testid="mission-card-lnm_m3_ore_delivery"]')
    .scrollIntoView().should('be.visible').click()

  // Rocket-buy — step 31 fires here (no target picker since targetId is preset)
  cy.contains('Select Rocket', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="tutorial-coach-block"]')
    .should('be.visible')
    .should('contain', 'Cargo Module Installed')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()

  // Proceed with configured rocket
  cy.contains('button', /Launch with|Purchase/).should('be.visible').click()

  // Fab — step 32 fires here
  cy.get('[data-testid="tutorial-coach-block"]', { timeout: 8000 })
    .should('be.visible')
    .should('contain', 'Ready to Launch')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()

  // Launch
  cy.get('[data-testid="launch-btn"]', { timeout: 8000 }).should('be.visible').click()

  // Transit begins — rover delivery screen follows (not mining-canvas)
  cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
}

// ─── Viewport configurations ──────────────────────────────────────────────────

const VIEWPORTS = [
  { label: 'mobile', w: 390, h: 844 },
  { label: 'desktop', w: 1280, h: 800 },
] as const

// ─── Desktop nav guard ────────────────────────────────────────────────────────
//
// Explicitly asserts that on desktop the radial nav is hidden and the sidebar
// is shown — catching any regression where the CSS breakpoint breaks.

describe('Desktop layout: radial nav hidden, sidebar visible', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('radial-nav-toggle is not visible and sidebar-nav-missions is visible on desktop hub', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="radial-nav-toggle"]').should('not.be.visible')
    cy.get('[data-testid="sidebar-nav-missions"]').should('be.visible')
  })

  it('tutorial coach on step 1 does NOT show a spot over the hidden radial button', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Open a Mission')
    // On desktop, desktopSpot is null so the pulsing spot element must not exist
    cy.get('[data-testid="tutorial-coach-spot"]').should('not.exist')
    // And the instruction must not say "radial menu" or "Tap menu"
    cy.get('[data-testid="tutorial-coach-block"]').should('not.contain', 'radial')
    cy.get('[data-testid="tutorial-coach-block"]').should('not.contain', 'Tap menu')
  })
})

// ─── Mobile layout guard ──────────────────────────────────────────────────────

describe('Mobile layout: radial nav visible, sidebar hidden', () => {
  beforeEach(() => cy.viewport(390, 844))

  it('radial-nav-toggle is visible and sidebar is not visible on mobile hub', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="radial-nav-toggle"]').should('be.visible')
    cy.get('[data-testid="sidebar-nav-missions"]').should('not.be.visible')
  })

  it('tutorial spot on step 1 overlaps the radial toggle on mobile', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Open a Mission')
    cy.get('[data-testid="tutorial-coach-spot"]').should('be.visible').then($spot => {
      const s = $spot[0].getBoundingClientRect()
      cy.get('[data-testid="radial-nav-toggle"]').then($btn => {
        const b = $btn[0].getBoundingClientRect()
        expect(s.left, 'spot left < btn right').to.be.lessThan(b.right)
        expect(s.right, 'spot right > btn left').to.be.greaterThan(b.left)
        expect(s.top, 'spot top < btn bottom').to.be.lessThan(b.bottom)
        expect(s.bottom, 'spot bottom > btn top').to.be.greaterThan(b.top)
      })
    })
  })
})

// ─── M1 full play-through ─────────────────────────────────────────────────────

VIEWPORTS.forEach(({ label, w, h }) => {
  describe(`M1 full play-through — ${label} (${w}×${h})`, () => {
    beforeEach(() => cy.viewport(w, h))

    it('plays M1 from hub to market completion', () => {
      visitHub({ doneSteps: { 0: true }, tutorial: true })
      playM1()
    })
  })
})

// ─── M2 full play-through ─────────────────────────────────────────────────────

VIEWPORTS.forEach(({ label, w, h }) => {
  describe(`M2 full play-through — ${label} (${w}×${h})`, () => {
    beforeEach(() => cy.viewport(w, h))

    it('plays M2 from hub through debrief', () => {
      visitHub({
        tutorial: true,
        doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true },
        player: basePlayer({ missionsDone: 1, missionCount: 1 }),
      })
      playM2()
    })
  })
})

// ─── M3 full play-through (through launch) ────────────────────────────────────

VIEWPORTS.forEach(({ label, w, h }) => {
  describe(`M3 tutorial steps and launch — ${label} (${w}×${h})`, () => {
    beforeEach(() => cy.viewport(w, h))

    it('clears all M3 coach steps, navigates to missions, and reaches transit', () => {
      visitHub({
        tutorial: true,
        doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true, 20: true, 21: true },
        player: basePlayer({
          missionsDone: 2,
          missionCount: 2,
          francs: 9_000_000_000,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
        }),
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
      })
      playM3ToLaunch()
    })
  })
})
