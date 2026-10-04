import { assertOnHome } from '../../support/home-helpers'
import { seedFixtureSession } from '../../support/authenticated-fixture'

export {}
// Full M1/M2/M3 tutorial play-through tests.
//
// These tests play the game as a real user would — they navigate using whatever
// nav element is VISIBLE on screen, not by force-clicking hidden elements.
//
// Every width: the shared bottom bar (home-bar-*) is the navigation.
//
// Mission setup is one routed scene at /game/missions: contract carousel,
// target map, vehicle blueprint, then hangar assembly / launch review.
//
// Failure modes caught:
//   - Tutorial coach pointing to a nav element that doesn't exist on this layout
//   - Tutorial spot highlighting a hidden button
//   - Broken screen transitions on either layout

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

// PixiJS v8 can throw _cancelResize during teardown when component cleanup
// races an in-flight async app.init() (e.g. MiningCanvas or a Hub scene torn
// down mid-transition) — an uncaught rejection Next's error boundary turns
// into a full-screen "SIGNAL INTERRUPTED" crash. Same known issue and same
// suppression already used in visual-qa.cy.ts; the visual content/game state
// is unaffected, so this is a teardown-only artifact, not a real failure.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('_cancelResize')) return false
  return true
})

const ALL_SURVEY_KEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext',
        'lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext',
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
    clientMissions: {},
    clientStreaks: {},
    clientCooldowns: {},
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
    clientTerritories: {},
    ...overrides,
  }
}

function suppressSurveys(win: Window) {
  win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEY_KEYS))
  win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  seedFixtureSession(win)
}

function visitHub(overrides: Record<string, unknown> = {}) {
  cy.visit('/game', {
    onBeforeLoad(win) {
      // Write the save before the session: seedFixtureSession mirrors it
      // into the signed-in account's slot, which is what the game loads.
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
      suppressSurveys(win)
    },
  })
}

// ─── Home-chrome navigation helper ───────────────────────────────────────────
//
// The persistent Home chrome replaces the retired breakpoint-specific bottom
// tab and desktop dock. It is the one operations entry a player can use at
// every viewport.

function navToMissions() {
  cy.get('[data-testid="home-bar-ops"]').should('be.visible').click()
  cy.get('[data-testid="mission-board-section-client"]', { timeout: 10000 }).should('be.visible')
}

function expectCoach(title: string) {
  cy.get('[data-testid="flight-plan"]', { timeout: 10000 })
    .should('be.visible')
    .should('contain', title)
}

/** Tap a body on the target map at its own touch circle, as a finger would. */
function pickTarget(targetId: string) {
  cy.get(`[data-testid="target-${targetId}"]`).then($body => {
    const group = $body[0].getBoundingClientRect()
    const hit = $body.find('circle')[0].getBoundingClientRect()
    cy.wrap($body).click(hit.left + hit.width / 2 - group.left, hit.top + hit.height / 2 - group.top)
  })
}

/** Hangar assembly → roll out → launch → (dev) skip the Pixi launch scene. */
function rollOutAndLaunch() {
  cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('have.attr', 'data-location', 'hangar')
  cy.get('[data-testid="transfer-to-launchpad-btn"]').should('be.visible').click()
  cy.get('[data-testid="mission-launch-review"]').should('have.attr', 'data-location', 'launchpad')
  cy.get('[data-testid="launch-btn"]').should('be.visible').click()
  // DEV-only skip for the Pixi launch sequence (same trade-off as mining below).
  cy.get('[data-testid="launch-sequence-skip-btn"]', { timeout: 10000 }).click()
  cy.location('pathname', { timeout: 15000 }).should('eq', '/game/transit')
  cy.contains(/MISSION TRANSIT/i).should('be.visible')
}

// ─── Mining play-through (same on mobile/desktop) ─────────────────────────────

// `mineReal=true` (CYPRESS_mineReal env var) plays the actual firing
// minigame — slow and bottlenecked by real ore-transit timing (ore sweeps
// through the firing zone in bursts with multi-second gaps) and by Cypress
// retrying the ENTIRE test from scratch on failure, not just the mining
// step. Default is the DEV-only "Skip Mining" shortcut
// (`dev-skip-mining-btn`, MiningScreen.tsx, NODE_ENV==='development' only) —
// fills the order instantly. This is a deliberate trade-off for recording/CI
// reliability, not a claim that real mining is unplayable.
const MINE_REAL = Cypress.env('mineReal') === true || Cypress.env('mineReal') === 'true'

function completeMining() {
  // Onboarding transit is a short timed flight that lands on the mining scene.
  cy.location('pathname', { timeout: 20000 }).should('eq', '/game/mining')
  cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')

  if (!MINE_REAL) {
    cy.get('[data-testid="dev-skip-mining-btn"]', { timeout: 8000 }).should('be.visible').click()
    // The development shortcut fills the order and calls onComplete directly;
    // it intentionally bypasses the real player's Return/Deliver button.
    cy.location('pathname', { timeout: 15000 }).should('eq', '/game/transit')
    return
  }

  // Firing doesn't guarantee a hit — the laser only collects ore that's swept
  // through the firing zone at that instant. MiningScreen exposes a
  // `data-ore-near` attribute (the same signal that drives the coach pulse
  // ring) — poll it and only fire while it's true, as a player times shots.
  function fireWhenNear(attemptsLeft: number) {
    cy.get('[data-testid="return-home-btn"]').then($btn => {
      if (!$btn.is(':disabled') || attemptsLeft <= 0) return
      cy.get('[data-testid="fire-laser-btn"]').then($fireBtn => {
        if ($fireBtn.is(':disabled')) return // laser depleted — nothing more to try
        cy.get('[data-ore-near]').invoke('attr', 'data-ore-near').then(near => {
          if (near === 'true') cy.get('[data-testid="fire-laser-btn"]').click()
          cy.wait(120)
          fireWhenNear(attemptsLeft - 1)
        })
      })
    })
  }
  fireWhenNear(1800)
  cy.get('[data-testid="return-home-btn"]', { timeout: 15000 }).should('not.be.disabled').click()
}

function completeDebrief() {
  // The Earth-return leg lands on the debrief. Every debrief starts with the
  // explicit vehicle teardown (KES-348) — onboarding included — before the
  // reward can be collected.
  cy.location('pathname', { timeout: 20000 }).should('eq', '/game/debrief')
  cy.get('[data-testid="resolve-cargo-btn"]', { timeout: 10000 }).should('be.visible').click()
  cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).click()
  cy.get('[data-testid="collect-reward-btn"]').should('be.visible').click()
}

// ─── Full M1 play-through ─────────────────────────────────────────────────────

function playM1() {
  assertOnHome(10000)

  // SSL-405: the Flight Plan strip leads with the active try's objective.
  // The coach body only shows when the strip is expanded (and never at
  // <=520px), so these checks read the always-visible objective line.
  // Step 1: open client contracts from the shared Home bar.
  expectCoach('Open client contracts')
  navToMissions()

  // Step 2: pick the M1 contract
  expectCoach('Accept a mining contract')
  cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').should('be.visible').click()

  // Step 3: pick a target on the map
  cy.get('[data-testid="mission-target-map"]', { timeout: 8000 }).should('be.visible')
  expectCoach('Choose the highlighted target')
  pickTarget('eros')
  cy.get('[data-testid="target-selection-summary"]').should('contain', '433 Eros')
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()

  // Step 4: vehicle blueprint — the Explorer is free during onboarding.
  // The strip stays up (the try has no blueprint-specific step) and the
  // Flight Plan has no manual Continue button on a try step.
  cy.get('[data-testid="mission-rocket-blueprint"]', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="flight-plan"]').should('be.visible')
  cy.get('[data-testid="flight-plan-continue"]').should('not.exist')
  cy.get('[data-testid="purchase-rocket-btn"]').should('contain', 'BUILD EXPLORER').click()

  // Step 5: hangar assembly, then roll out and launch
  rollOutAndLaunch()

  completeMining()
  completeDebrief()

  // Collecting the M1 reward completes the mining try; the Flight Plan hands
  // over to the scan try on the Galaxy screen.
  cy.location('pathname', { timeout: 15000 }).should('eq', '/game/galaxy')
  assertOnHome(10000)
  expectCoach('Classify the transit candidate')
}

// ─── Scan try (after the mining try) ──────────────────────────────────────────
//
// SSL-405 replaced the Transport and Storage Silo lessons with the three-try
// Flight Plan (mining, scan, part). With the mining try done the Hub leads with
// the scan try while client contracts stay open on the Ops board.

function playScanTryHandoff() {
  assertOnHome(10000)
  expectCoach('Classify the transit candidate')
  navToMissions()
  cy.get('[data-testid^="mission-accept-"]').should('exist')
}

// ─── Viewport configurations ──────────────────────────────────────────────────

const VIEWPORTS = [
  { label: 'mobile portrait', w: 390, h: 844 },
  { label: 'tablet portrait', w: 768, h: 1024 },
  { label: 'desktop', w: 1280, h: 800 },
] as const

// ─── Recording filters ─────────────────────────────────────────────────────────
//
// Unset by default — every describe below runs, exactly as before. Set to
// scope a single spec run to one mission's playthrough (e.g. for a per-
// mission onboarding video, one file per mission rather than one file
// covering the full layout-guard + M1 + M2 + M3 matrix):
//
//   CYPRESS_mission=M1 CYPRESS_viewportLabel="mobile portrait" \
//     npx cypress run --spec cypress/e2e/journeys/tutorial-m1.cy.ts --config video=true
//
// `mission` also skips the layout-guard describes below (not a mission
// playthrough, so out of scope for a mission-specific video).

const MISSION_FILTER = Cypress.env('mission') as 'M1' | 'M2' | undefined
const VIEWPORT_FILTER = Cypress.env('viewportLabel') as string | undefined
const viewportsToRun = VIEWPORTS.filter(v => !VIEWPORT_FILTER || v.label === VIEWPORT_FILTER)


// ─── Shared Home chrome ───────────────────────────────────────────────────────

if (!MISSION_FILTER) describe('Desktop layout: Home chrome is the operations entry', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('keeps the operations control available without retired navigation', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.get('[data-testid="home-bottom-bar"]').should('be.visible')
    cy.get('[data-testid="home-bar-ops"]').should('be.visible')
    cy.get('[data-testid="sidebar-nav-missions"]').should('not.exist')
  })

  it('directs the first mining try to the Launchpad', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.get('[data-testid="flight-plan"]').should('contain', 'Open client contracts')
    cy.get('html').should('have.attr', 'data-flight-target').and('include', 'building-launchpad')
  })
})

// ─── Mobile Home chrome ───────────────────────────────────────────────────────

if (!MISSION_FILTER) describe('Mobile layout: Home chrome is visible, sidebar hidden', () => {
  beforeEach(() => cy.viewport(390, 844))

  it('keeps the operations control available and the retired sidebar absent', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.get('[data-testid="home-bar-ops"]').should('be.visible')
    cy.get('[data-testid="sidebar-nav-missions"]').should('not.exist')
  })

  it('directs the first mining try to the Launchpad', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.get('[data-testid="flight-plan"]').should('contain', 'Open client contracts')
    cy.get('html').should('have.attr', 'data-flight-target').and('include', 'building-launchpad')
  })
})

// ─── M1 full play-through ─────────────────────────────────────────────────────

if (!MISSION_FILTER || MISSION_FILTER === 'M1') viewportsToRun.forEach(({ label, w, h }) => {
  describe(`M1 full play-through — ${label} (${w}×${h})`, () => {
    beforeEach(() => cy.viewport(w, h))

    it('plays M1 from hub through debrief to the scan try', () => {
      visitHub({ doneSteps: { 0: true }, tutorial: true })
      playM1()
    })
  })
})

// ─── M2 full play-through ─────────────────────────────────────────────────────

if (!MISSION_FILTER || MISSION_FILTER === 'M2') viewportsToRun.forEach(({ label, w, h }) => {
  describe(`Scan try handoff — ${label} (${w}×${h})`, () => {
    beforeEach(() => cy.viewport(w, h))

    it('keeps the scan try on the Hub with client contracts still open', () => {
      visitHub({
        tutorial: true,
        doneSteps: { 0: true },
        player: basePlayer({ missionsDone: 1, missionCount: 1, flightPlan: { completed: { mining: true }, hidden: false } }),
      })
      playScanTryHandoff()
    })
  })
})
