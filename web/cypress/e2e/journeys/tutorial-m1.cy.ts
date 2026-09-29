import { seedFixtureSession } from '../../support/authenticated-fixture'

export {}
// Full agency-training play-through tests: Extraction (M1), then the Transport
// courier job (SSL-332, SSL-362).
//
// These tests play the game as a real user would — they navigate using whatever
// nav element is VISIBLE on screen, not by force-clicking hidden elements.
//
// Desktop (≥1024px): bottom tab bar is display:none; use the hub's own
//                    desktop Missions action (the sidebar nav is retired).
// Mobile (<1024px):  use bottom-tab-* directly.
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

// ─── Layout-aware nav helper ──────────────────────────────────────────────────
//
// This is the crux of the desktop bug: on mobile the bottom tab bar is
// visible, on desktop it is hidden. Tests MUST use the element the user can
// actually see.

function navToMissions() {
  cy.window().then(win => {
    const isDesktop = win.innerWidth >= 1024
    if (isDesktop) {
      // The old always-on desktop sidebar nav (`sidebar-nav-missions`) was
      // retired; the Hub dock's desktop Missions action is the entry point
      // that is present regardless of tutorial state.
      cy.get('[data-testid="bottom-tab-missions"]').should('not.be.visible')
      cy.get('[data-testid="hub-desktop-missions-btn"]').should('be.visible').click()
    } else {
      cy.get('[data-testid="bottom-tab-missions"]').should('be.visible').click()
    }
  })
  cy.get('[data-testid="mission-board-section-client"]', { timeout: 10000 }).should('be.visible')
}

function expectCoach(title: string) {
  cy.get('[data-testid="tutorial-coach-block"]', { timeout: 10000 })
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
  cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 10000 }).should('be.visible')

  // Step 1: tutorial coach says to open missions — follow what's VISIBLE on screen
  expectCoach('Open a Mission')
  navToMissions()

  // Step 2: pick the M1 contract
  expectCoach('Select a Mission')
  cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').should('be.visible').click()

  // Step 3: pick a target on the map
  cy.get('[data-testid="mission-target-map"]', { timeout: 8000 }).should('be.visible')
  expectCoach('Choose a Destination')
  pickTarget('eros')
  cy.get('[data-testid="target-selection-summary"]').should('contain', '433 Eros')
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()

  // Step 4: vehicle blueprint — the Explorer is free during onboarding
  cy.get('[data-testid="mission-rocket-blueprint"]', { timeout: 8000 }).should('be.visible')
  expectCoach('Choose a Vehicle')
  cy.get('[data-testid="purchase-rocket-btn"]').should('contain', 'BUILD EXPLORER').click()

  // Step 5: hangar assembly (manual coach card), then roll out and launch
  expectCoach('Assemble the Rocket')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()
  rollOutAndLaunch()

  completeMining()
  completeDebrief()

  // Collecting the Extraction reward returns to Hub and the coach immediately
  // opens the Transport lesson. Case-insensitive: the label is visually
  // all-caps via CSS text-transform, not literal uppercase DOM text.
  cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="tutorial-coach-block"]', { timeout: 8000 }).contains(/transport/i).should('be.visible')
}

// ─── Full Transport play-through ──────────────────────────────────────────────
//
// Guided mission 2 (SSL-332) is a courier job (SSL-362): the client's cargo is
// loaded on Earth, flown to their depot and unloaded. The depot is fixed, so
// accepting a contract skips the target map; there is no mining leg.

function playTransport() {
  cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 10000 }).should('be.visible')

  // Step 30: hub action step (auto-dismisses on nav).
  expectCoach('Transport')
  navToMissions()

  cy.get('[data-testid="mission-accept-lnm_transport_courier_vesta"]').should('be.visible').click()

  // Blueprint — step 31 fires here (no target map since the depot is fixed).
  cy.get('[data-testid="mission-rocket-blueprint"]', { timeout: 8000 }).should('be.visible')
  expectCoach('Cargo Delivery')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()
  cy.get('[data-testid="purchase-rocket-btn"]').should('be.visible').click()

  // Hangar assembly — step 32 fires here.
  expectCoach('Confirm The Run')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()
  rollOutAndLaunch()

  // The hold was loaded on Earth, so the first leg is the delivery leg.
  cy.contains(/Delivery LEG · MISSION TRANSIT/i).should('be.visible')
  cy.location('pathname', { timeout: 20000 }).should('eq', '/game/delivery')
  expectCoach('Unload At The Depot')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()
  cy.get('[data-testid="delivery-dump-cargo"]', { timeout: 15000 }).should('not.be.disabled').click()
  cy.get('[data-testid="delivery-return-rover"]', { timeout: 15000 }).should('be.visible').click()

  completeDebrief()

  // Transport done: the Hub points at the Storage Silo, the last training step.
  cy.get('[data-testid="progression-card-storage-silo"]', { timeout: 10000 }).should('exist')
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
// covering the full layout-guard + M1 + Transport matrix):
//
//   CYPRESS_mission=M1 CYPRESS_viewportLabel="mobile portrait" \
//     npx cypress run --spec cypress/e2e/journeys/tutorial-m1.cy.ts --config video=true
//
// `mission` also skips the layout-guard describes below (not a mission
// playthrough, so out of scope for a mission-specific video).

const MISSION_FILTER = Cypress.env('mission') as 'M1' | 'Transport' | undefined
const VIEWPORT_FILTER = Cypress.env('viewportLabel') as string | undefined
const viewportsToRun = VIEWPORTS.filter(v => !VIEWPORT_FILTER || v.label === VIEWPORT_FILTER)


// ─── Desktop nav guard ────────────────────────────────────────────────────────
//
// Explicitly asserts that on desktop the bottom tab bar is hidden and the
// hub's own Missions action is shown — catching any regression where the CSS
// breakpoint breaks.

if (!MISSION_FILTER) describe('Desktop layout: bottom tab bar hidden, sidebar retired', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('bottom-tab-missions is hidden and the retired sidebar is gone on desktop hub; the desktop Missions action remains available', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="bottom-tab-missions"]').should('not.be.visible')
    // The old always-on desktop sidebar is retired and no longer rendered.
    cy.get('[data-testid="sidebar-nav-missions"]').should('not.exist')
    cy.get('[data-testid="hub-desktop-missions-btn"]').should('be.visible')
  })

  it('tutorial coach on step 1 does NOT ring the hidden bottom tab bar', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Open a Mission')
    // The desktop instruction names the Launchpad; no measured ring is drawn.
    cy.get('[data-testid="tutorial-coach-ring"]').should('not.exist')
    // And the instruction must not say "Tap menu" (the old two-stage copy)
    cy.get('[data-testid="tutorial-coach-block"]').should('not.contain', 'Tap menu')
  })
})

// ─── Mobile layout guard ──────────────────────────────────────────────────────

if (!MISSION_FILTER) describe('Mobile layout: bottom tab bar visible, sidebar hidden', () => {
  beforeEach(() => cy.viewport(390, 844))

  it('bottom-tab-missions is visible and the retired sidebar is gone on mobile hub', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="bottom-tab-missions"]').should('be.visible')
    cy.get('[data-testid="sidebar-nav-missions"]').should('not.exist')
  })

  it('tutorial coach on step 1 highlights the Missions tab on mobile', () => {
    // The Missions tab is highlighted by CSS on the element itself
    // (html[data-coach-target] in globals.css), which can't drift; the
    // separately measured CoachPointer ring is suppressed for it (SSL-280).
    visitHub({ doneSteps: { 0: true } })
    cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Open a Mission')
    cy.get('html').should('have.attr', 'data-coach-target', 'bottom-tab-missions')
    cy.get('[data-testid="tutorial-coach-ring"]').should('not.exist')
  })
})

// ─── M1 full play-through ─────────────────────────────────────────────────────

if (!MISSION_FILTER || MISSION_FILTER === 'M1') viewportsToRun.forEach(({ label, w, h }) => {
  describe(`M1 full play-through — ${label} (${w}×${h})`, () => {
    beforeEach(() => cy.viewport(w, h))

    it('plays Extraction from hub through debrief to the Transport handoff', () => {
      visitHub({ doneSteps: { 0: true }, tutorial: true })
      playM1()
    })
  })
})

// ─── Transport full play-through ──────────────────────────────────────────────

// Every coach step a real player completes during Extraction, including the
// blueprint's "Choose a Vehicle" (8).
const M1_DONE_STEPS = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 8: true, 9: true }

if (!MISSION_FILTER || MISSION_FILTER === 'Transport') viewportsToRun.forEach(({ label, w, h }) => {
  describe(`Transport full play-through — ${label} (${w}×${h})`, () => {
    beforeEach(() => cy.viewport(w, h))

    it('plays the courier job from hub through debrief to the Storage Silo stage', () => {
      visitHub({
        tutorial: true,
        doneSteps: M1_DONE_STEPS,
        player: basePlayer({ missionsDone: 1, missionCount: 1, francs: 9_000_000_000 }),
      })
      playTransport()
    })
  })
})
