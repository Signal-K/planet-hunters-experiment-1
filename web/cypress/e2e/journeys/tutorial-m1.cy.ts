export {}
// Full M1/M2/M3 tutorial play-through tests.
//
// These tests play the game as a real user would — they navigate using whatever
// nav element is VISIBLE on screen, not by force-clicking hidden elements.
//
// Desktop (≥1024px): bottom tab bar is display:none; use sidebar-nav-* instead.
// Mobile (<1024px):  sidebar is display:none; use bottom-tab-* directly.
//
// Failure modes caught:
//   - Tutorial coach pointing to a nav element that doesn't exist on this layout
//   - Tutorial spot highlighting a hidden button
//   - Broken screen transitions on either layout

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

// PixiJS v8 can throw _cancelResize during teardown when component cleanup
// races an in-flight async app.init() (e.g. MiningCanvas/HubPixiCanvas torn
// down mid-transition) — an uncaught rejection Next's error boundary turns
// into a full-screen "SIGNAL INTERRUPTED" crash. Same known issue and same
// suppression already used in visual-qa.cy.ts; the visual content/game state
// is unaffected, so this is a teardown-only artifact, not a real failure.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('_cancelResize')) return false
  return true
})

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
// This is the crux of the desktop bug: on mobile the bottom tab bar is
// visible and the sidebar is hidden, and vice versa on desktop. Tests MUST
// use the element the user can actually see.

function navToMissions() {
  cy.window().then(win => {
    const isDesktop = win.innerWidth >= 1024
    if (isDesktop) {
      // Sidebar is always visible on desktop; bottom tab bar is display:none.
      cy.get('[data-testid="bottom-tab-missions"]').should('not.be.visible')
      cy.get('[data-testid="sidebar-nav-missions"]').should('be.visible').click()
    } else {
      cy.get('[data-testid="bottom-tab-missions"]').should('be.visible').click()
    }
  })
  cy.contains('Mission Board', { timeout: 8000 }).should('be.visible')
}

// ─── Mining play-through (same on mobile/desktop) ─────────────────────────────

function completeMining() {
  // Launch animation is 8.5s — allow 15s for the animation to complete and transit to appear
  cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
  cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
  // Firing doesn't guarantee a hit — the laser only collects ore that's swept
  // through the firing zone at that instant (real-time collision, not per-click).
  // Blind-firing on a fixed interval regardless of ore position was unreliable
  // (could exhaust laser charges — "Laser Depleted" — well before the order
  // filled, since most shots landed while no ore was in range). MiningScreen
  // exposes a `data-ore-near` attribute (the same signal that drives the
  // tutorial-coach pulse ring) — poll it and only fire while it's true, same
  // as how a player would time shots by watching the pulse.
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
  fireWhenNear(400)
  cy.get('[data-testid="return-home-btn"]', { timeout: 10000 }).should('not.be.disabled').click()
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
  // Small settle wait: the coach action-card is a fresh mount here (font/layout
  // can still be settling right after the missions-screen transition), and an
  // early actionability check can otherwise see a transient overlap.
  cy.wait(300)
  // Cypress's actionability check intermittently reports this card as "covered"
  // by the tutorial coach card, but measuring both elements' real
  // getBoundingClientRect() at click time shows a large gap (coach bottom
  // ~150-160px, card top ~260-270px on both viewports) and
  // document.elementFromPoint(cardCenter) resolves to the card itself — this
  // is the same class of Cypress false-positive as the coach-ring visibility
  // check above, not a real layout overlap. Force the click like the other
  // canvas/coach-adjacent interactions in this file.
  cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]')
    .should('be.visible').click({ force: true })

  // Step 3: pick target
  cy.contains('Pick Target', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="target-eros"]').should('exist').click({ force: true })
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()

  // Step 4: rocket selection — Explorer is free
  cy.contains('Select Rocket', { timeout: 8000 }).should('be.visible')
  cy.contains('button', 'Launch with Explorer').should('be.visible').click()

  // Step 5: assembly → confirm launch
  cy.get('[data-testid="launch-btn"]', { timeout: 8000 }).should('be.visible').click()

  completeMining()
  completeDebrief()

  cy.contains('Commodity Exchange', { timeout: 8000 }).should('be.visible')
}

// ─── Full M2 play-through ─────────────────────────────────────────────────────
//
// Starts from hub with missionsDone=1 and M2 tutorial active.
// Step 20 is an action coach card on hub (auto-dismisses on nav); step 21 is
// a manual coach card on rocket-buy.

function playM2() {
  cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')

  // M2 step 20: hub action step (not manual — no "got it" button, it
  // auto-dismisses when the player navigates to missions). Current copy is
  // 'Guided Ops · Mission 2' (see lib/data/tutorial.ts M2_STEPS[0]).
  cy.get('[data-testid="tutorial-coach-block"]')
    .should('be.visible')
    .should('contain', 'Guided Ops')

  // Navigate to missions using the layout-correct nav
  navToMissions()

  // Pick M2 silicon order
  cy.get('[data-testid="mission-card-generated-s2-starter-bulk-4"]')
    .scrollIntoView().should('be.visible').click()

  // Pick target
  cy.contains('Pick Target', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="target-eros"]').should('exist').click({ force: true })
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()

  // Rocket purchase screen — step 21 fires here (manual card, current copy is
  // 'Prospector — Select Your Rocket', see lib/data/tutorial.ts M2_STEPS[1])
  cy.contains('Select Rocket', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="tutorial-coach-block"]')
    .should('be.visible')
    .should('contain', 'Select Your Rocket')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()

  // Purchase Prospector
  cy.contains('button', /Purchase/).should('be.visible').click()

  // Fab → launch
  cy.get('[data-testid="launch-btn"]', { timeout: 8000 }).should('be.visible').click()

  completeMining()
  completeDebrief()
}

// ─── Full M3 play-through ─────────────────────────────────────────────────────
//
// M3 is now a two-leg contractor transport job (mine at a pickup target, then
// deliver to a second target before flying home) — see [[Decide: M3 becomes
// a transport mission]]. Both M3 missions have preset targetId/deliveryTargetId,
// so picking one skips the target picker and goes straight to rocket-buy, same
// as the old self-directed M3 flow it replaced.

function playM3ToLaunch() {
  cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')

  // Step 30: hub action step (not manual — auto-dismisses on nav, like M2's
  // step 20). Current copy is 'Guided Ops · Mission 3' (lib/data/tutorial.ts
  // M3_STEPS[0]).
  cy.get('[data-testid="tutorial-coach-block"]')
    .should('be.visible')
    .should('contain', 'Guided Ops')

  // Navigate to missions
  navToMissions()

  // Pick one of the two M3 transport-contractor missions.
  cy.get('[data-testid="mission-card-lnm_m3_relay_bennu_vesta"]')
    .scrollIntoView().should('be.visible').click()

  // Rocket-buy — step 31 fires here (no target picker since targetId is preset).
  // Current copy is 'Two-Stop Route' (lib/data/tutorial.ts M3_STEPS[1]).
  cy.contains('Select Rocket', { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="tutorial-coach-block"]')
    .should('be.visible')
    .should('contain', 'Two-Stop Route')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()

  // Purchase the suggested rocket
  cy.contains('button', /Purchase/).should('be.visible').click()

  // Fab — step 32 fires here. Current copy is 'Confirm The Run'
  // (lib/data/tutorial.ts M3_STEPS[2]).
  cy.get('[data-testid="tutorial-coach-block"]', { timeout: 8000 })
    .should('be.visible')
    .should('contain', 'Confirm The Run')
  cy.get('[data-testid="coach-got-it-btn"]').should('be.visible').click()

  // Launch
  cy.get('[data-testid="launch-btn"]', { timeout: 8000 }).should('be.visible').click()

  completeMining()

  // Cargo secured for the pickup leg — the two-leg mechanic routes to the
  // delivery target next, not straight home.
  cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
}

// ─── Viewport configurations ──────────────────────────────────────────────────

const VIEWPORTS = [
  { label: 'mobile', w: 390, h: 844 },
  { label: 'desktop', w: 1280, h: 800 },
] as const

// ─── Desktop nav guard ────────────────────────────────────────────────────────
//
// Explicitly asserts that on desktop the bottom tab bar is hidden and the
// sidebar is shown — catching any regression where the CSS breakpoint breaks.

describe('Desktop layout: bottom tab bar hidden, sidebar visible', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('bottom-tab-missions is not visible and sidebar-nav-missions is visible on desktop hub', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="bottom-tab-missions"]').should('not.be.visible')
    cy.get('[data-testid="sidebar-nav-missions"]').should('be.visible')
  })

  it('tutorial coach on step 1 does NOT show a spot over the hidden bottom tab bar', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Open a Mission')
    // On desktop, desktopSpot is null so the pulsing spot element must not exist
    cy.get('[data-testid="tutorial-coach-spot"]').should('not.exist')
    // And the instruction must not say "Tap menu" (the old two-stage copy)
    cy.get('[data-testid="tutorial-coach-block"]').should('not.contain', 'Tap menu')
  })
})

// ─── Mobile layout guard ──────────────────────────────────────────────────────

describe('Mobile layout: bottom tab bar visible, sidebar hidden', () => {
  beforeEach(() => cy.viewport(390, 844))

  it('bottom-tab-missions is visible and sidebar is not visible on mobile hub', () => {
    visitHub({ doneSteps: { 0: true } })
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="bottom-tab-missions"]').should('be.visible')
    cy.get('[data-testid="sidebar-nav-missions"]').should('not.be.visible')
  })

  it('tutorial coach ring on step 1 overlaps the Missions tab on mobile', () => {
    // The old 'spot' rectangle concept (tutorial-coach-spot) was replaced by
    // CoachPointer's measured ring (tutorial-coach-ring), which highlights
    // the element matching step.coachId ('bottom-tab-missions' for step 1)
    // — see lib/data/tutorial.ts and components/game/CoachPointer.tsx.
    visitHub({ doneSteps: { 0: true } })
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Open a Mission')
    // The ring is a decorative, pointerEvents:'none' overlay — Cypress's
    // be.visible check uses elementFromPoint, which always reports it as
    // "covered" by whatever's underneath since it's excluded from hit-testing.
    // Assert existence + the bounding-rect overlap instead of visibility.
    cy.get('[data-testid="tutorial-coach-ring"]').should('exist').then($ring => {
      const s = $ring[0].getBoundingClientRect()
      cy.get('[data-testid="bottom-tab-missions"]').then($btn => {
        const b = $btn[0].getBoundingClientRect()
        expect(s.left, 'ring left < btn right').to.be.lessThan(b.right)
        expect(s.right, 'ring right > btn left').to.be.greaterThan(b.left)
        expect(s.top, 'ring top < btn bottom').to.be.lessThan(b.bottom)
        expect(s.bottom, 'ring bottom > btn top').to.be.greaterThan(b.top)
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
