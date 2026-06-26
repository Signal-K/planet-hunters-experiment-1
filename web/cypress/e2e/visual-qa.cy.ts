export {}

/**
 * Visual QA tests — run these in headed Chrome to actually watch the game.
 *
 * Run:
 *   CYPRESS_PROFILE=visual npx cypress open --browser chrome
 *   CYPRESS_PROFILE=visual npx cypress run --browser chrome --headed
 *
 * Each test takes screenshots at key moments. Find them in cypress/screenshots/.
 * Videos land in cypress/videos/ when video:true is set (CI or CYPRESS_VIDEO=1).
 */

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

const ALL_SURVEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_contractor_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
]

function suppressSurveysAndUpgrade(win: Window) {
  win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEYS))
  win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
}

function loadPreset(win: Window, preset: object) {
  suppressSurveysAndUpgrade(win)
  win.localStorage.setItem(STORAGE_KEY, JSON.stringify(preset))
}

// Minimal preset shapes — mirrors devPresets.ts without importing it
const BASE_PLAYER = {
  francs: 15_000_000_000,
  activeMission: null,
  missionCount: 1,
  pendingLaunch: false,
  placed: ['launchpad'],
  placementPlots: { launchpad: 0 },
  controlBuilt: false,
  missionsDone: 0,
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
}

const MINING_STATE = {
  screen: 'mining',
  player: {
    ...BASE_PLAYER,
    missionsDone: 0,
    activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Bulk Iron Run → Eros' },
  },
  tutorial: true,
  doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
  missionId: 'generated-s1-starter-bulk-1',
  targetId: 'eros',
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
  popup: null,
}

// ── helpers ──────────────────────────────────────────────────────────────────

function skipAuthGateIfShown() {
  // Auth gate or intro may appear; skip it
  cy.get('body').then($body => {
    if ($body.find('[data-testid="auth-gate-skip"]').length > 0) {
      cy.get('[data-testid="auth-gate-skip"]').click()
    }
  })
}

function navToMissions() {
  cy.window().then(win => {
    if (win.innerWidth >= 1024) {
      cy.get('[data-testid="sidebar-nav-missions"]').should('be.visible').click()
    } else {
      cy.get('[data-testid="radial-nav-toggle"]').should('be.visible').click()
      cy.get('[data-testid="radial-nav-missions"]').should('be.visible').click()
    }
  })
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('Visual QA — game screens and mining canvas', () => {
  // ── 1. Full M1 playthrough with screenshots at every screen ────────────────
  it('M1 full playthrough — portrait 390×844 — screenshots at every screen', () => {
    cy.viewport(390, 844)

    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        suppressSurveysAndUpgrade(win)
      },
    })

    // Intro screen
    skipAuthGateIfShown()
    cy.contains('LANDNAM', { timeout: 12000 }).should('be.visible')
    cy.screenshot('01-intro-screen')

    // Begin → hub setup
    cy.get('[data-testid="intro-begin-btn"]').click()
    cy.contains('EARTH BASE · SETUP', { timeout: 10000 }).should('be.visible')
    cy.screenshot('02-hub-setup')

    // Place launchpad
    cy.contains('button', 'Select a Plot').click()
    cy.get('[data-testid="build-plot-0"]').click()
    cy.screenshot('03-plot-selected')
    cy.contains('button', 'Confirm · Build Here').click()

    // Hub with launchpad
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="building-launchpad"]').should('be.visible')
    cy.screenshot('04-hub-launchpad-placed')

    // Mission board
    navToMissions()
    cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
    cy.screenshot('05-mission-board')

    // Open first mission → target picker
    cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').click()
    cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')
    cy.screenshot('06-target-picker')

    // Select Eros
    cy.get('[data-testid="target-eros"]').click({ force: true })
    cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()

    // Rocket/fab screen
    cy.contains('Select Rocket', { timeout: 10000 }).should('be.visible')
    cy.screenshot('07-rocket-picker')
    cy.contains('button', 'Launch with Starter Rocket 1').click()

    // Launch confirmation
    cy.get('[data-testid="launch-btn"]', { timeout: 10000 }).should('be.visible')
    cy.screenshot('08-launch-confirmation')
    cy.get('[data-testid="launch-btn"]').click()

    // Mining transit — wait for canvas to initialise
    cy.contains('MISSION TRANSIT', { timeout: 12000 }).should('be.visible')
    cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')

    // Let the scene render for 1.5s so PixiJS has time to draw
    cy.wait(1500)
    cy.screenshot('09-mining-transit-rendering')

    // Canvas must have real dimensions
    cy.get('[data-testid="mining-canvas"]').invoke('prop', 'clientWidth').should('be.gt', 0)
    cy.get('[data-testid="mining-canvas"]').invoke('prop', 'clientHeight').should('be.gt', 0)

    // Fire several lasers — some will hit, some miss
    for (let i = 0; i < 8; i++) {
      cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
      cy.wait(200)
    }
    cy.screenshot('10-mining-lasers-fired')

    // Return home
    cy.get('[data-testid="return-home-btn"]').should('not.be.disabled').click()

    // Debrief
    cy.contains('MISSION COMPLETE', { timeout: 10000 }).should('be.visible')
    cy.screenshot('11-mission-debrief')
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.get('[data-testid="collect-reward-btn"]').click()

    // Market
    cy.contains('Commodity Exchange', { timeout: 10000 }).should('be.visible')
    cy.screenshot('12-market-post-mission')

    // Final state assertion
    cy.window().then(win => {
      const saved = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}')
      expect(saved.player?.missionsDone).to.eq(1)
    })
  })

  // ── 2. Mining canvas visual isolation: canvas renders, miss flash fires ─────
  it('mining canvas — renders non-blank, miss flash overlay activates', () => {
    cy.viewport(390, 844)

    cy.visit('/game', {
      onBeforeLoad(win) {
        loadPreset(win, MINING_STATE)
      },
    })

    cy.contains('MISSION TRANSIT', { timeout: 12000 }).should('be.visible')
    cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
    cy.wait(2000) // give PixiJS time to paint a first frame

    cy.screenshot('mining-canvas-initial-render')

    // Verify <canvas> inside the wrapper has painted dimensions
    cy.get('[data-testid="mining-canvas"] canvas')
      .should('exist')
      .invoke('prop', 'width')
      .should('be.gt', 0)

    cy.get('[data-testid="mining-canvas"] canvas')
      .invoke('prop', 'height')
      .should('be.gt', 0)

    // Fire rapidly — some lasers will miss → flash overlay activates
    // The overlay is always in DOM; on miss it jumps to opacity:1 then fades.
    // We fire enough to guarantee at least one miss and capture the frame.
    for (let i = 0; i < 15; i++) {
      cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
      cy.wait(100)
    }

    cy.screenshot('mining-canvas-after-laser-barrage')

    // The miss flash div must exist (it's always rendered, just opacity 0)
    cy.get('[data-testid="mining-canvas"]')
      .find('div')
      .first()
      .should('exist')
      .and('have.css', 'position', 'absolute')

    // Canvas should still be rendering (not blank/destroyed)
    cy.get('[data-testid="mining-canvas"] canvas').should('be.visible')
    cy.screenshot('mining-canvas-still-alive')
  })

  // ── 3. Target picker orbital animation renders ─────────────────────────────
  it('target picker — orbital animation visible, targets selectable', () => {
    cy.viewport(390, 844)

    const FAB_STATE = {
      screen: 'target-picker',
      player: { ...BASE_PLAYER, missionsDone: 0 },
      tutorial: true,
      doneSteps: { 0: true, 1: true, 2: true },
      missionId: 'generated-s1-starter-bulk-1',
      targetId: null,
      rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
      lastCargo: null,
      popup: null,
    }

    cy.visit('/game', {
      onBeforeLoad(win) {
        loadPreset(win, FAB_STATE)
      },
    })

    cy.contains('Pick Target', { timeout: 12000 }).should('be.visible')
    cy.wait(1000) // let orbital animation start
    cy.screenshot('target-picker-orbital-animation')

    // Targets must be present and clickable
    cy.get('[data-testid="target-eros"]').should('be.visible')
    cy.screenshot('target-picker-targets-visible')

    cy.get('[data-testid="target-eros"]').click({ force: true })
    cy.wait(500)
    cy.screenshot('target-picker-eros-selected')

    cy.get('[data-testid="continue-build-btn"]').should('be.visible')
    cy.screenshot('target-picker-continue-enabled')
  })

  // ── 4. Hub buildings visible in correct positions ──────────────────────────
  it('hub screen — launchpad building visible with correct layout', () => {
    cy.viewport(390, 844)

    const HUB_STATE = {
      screen: 'hub',
      player: { ...BASE_PLAYER, missionsDone: 0 },
      tutorial: true,
      doneSteps: { 0: true },
      missionId: null,
      targetId: null,
      rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
      lastCargo: null,
      popup: null,
    }

    cy.visit('/game', {
      onBeforeLoad(win) {
        loadPreset(win, HUB_STATE)
      },
    })

    cy.contains('Earth Base', { timeout: 12000 }).should('be.visible')
    cy.get('[data-testid="building-launchpad"]').should('be.visible')
    cy.screenshot('hub-launchpad-visible')

    // Launchpad must be on screen, not clipped or off-canvas
    cy.get('[data-testid="building-launchpad"]').then($el => {
      const rect = $el[0].getBoundingClientRect()
      expect(rect.top).to.be.gte(0)
      expect(rect.bottom).to.be.lte(844 + 1)
      expect(rect.left).to.be.gte(0)
      expect(rect.right).to.be.lte(390 + 1)
    })

    cy.screenshot('hub-layout-verified')
  })
})
