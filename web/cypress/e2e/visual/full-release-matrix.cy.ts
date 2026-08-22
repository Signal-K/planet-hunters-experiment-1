export {}

// Release-gate journey: a fresh player completes the active onboarding path at
// every supported layout class. A second, deterministic surface pass records
// the late-game operations that are not yet part of that onboarding route.
// Screenshots are evidence of visible state; assertions after interactions
// prove the route progressed.

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

const VIEWPORTS = [
  { label: 'mobile-portrait', width: 390, height: 844 },
  { label: 'mobile-landscape', width: 926, height: 428 },
  { label: 'tablet-portrait', width: 768, height: 1024 },
  { label: 'desktop', width: 1280, height: 800 },
] as const

const requestedViewport = Cypress.env('RELEASE_MATRIX_VIEWPORT') as string | undefined
const activeViewports = requestedViewport
  ? VIEWPORTS.filter(viewport => viewport.label === requestedViewport)
  : VIEWPORTS

if (requestedViewport && activeViewports.length === 0) {
  throw new Error(`Unknown RELEASE_MATRIX_VIEWPORT: ${requestedViewport}`)
}

const EXTENDED_SURFACES = [
  { key: 'm3-mining', screen: 'mining', name: 'm3-mining', selector: '[data-testid="mining-canvas"]' },
  { key: 'm3-debrief', screen: 'debrief', name: 'm3-debrief', selector: '.debrief-screen' },
  { key: 'ui-mission-board', screen: 'missions', name: 'free-ops-mission-board', selector: '.ln-scene-mission-board' },
  { key: 'ui-rover-mining', screen: 'rover-mining', name: 'free-ops-rover-mining', selector: '[data-testid="rover-mining-screen"]' },
  { key: 'telescope-fab', screen: 'fab', name: 'telescope-launch-fab', selector: '.mission-setup-screen' },
  { key: 'telescope-transit', screen: 'transit', name: 'telescope-launch-transit', selector: '.transit-screen' },
  { key: 'telescope-debrief', screen: 'debrief', name: 'telescope-launch-debrief', selector: '.debrief-screen' },
  {
    key: 'ui-tess-discovery', screen: 'galaxy', name: 'citizen-science-tess',
    selector: '[data-testid="tess-discovery-screen"]', readySelector: '[data-testid="tess-data-provenance"]',
  },
  {
    key: 'ui-asteroid-discovery', screen: 'asteroid-discovery', name: 'citizen-science-asteroid',
    selector: '[data-testid="asteroid-discovery-screen"]', readySelector: '[data-testid="neocp-data-provenance"]',
  },
] as const

const SURVEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
  'lnm_satellite_clarity', 'lnm_resume_mission', 'lnm_base_building', 'lnm_rover_clarity',
]

function screenshot(viewport: string, name: string) {
  cy.screenshot(`release-${viewport}-${name}`)
}

// The release matrix deliberately crosses several React screen transitions.
// Cypress's actionability retry can retain a button from the previous render
// while the next screen is already replacing it. Dispatch the click from the
// element Cypress just resolved, then assert the destination separately.
function clickDom(selector: string) {
  cy.get(selector).should('be.visible').click({ force: true })
}

function clickButton(text: string | RegExp) {
  cy.contains('button', text).should('be.visible').click({ force: true })
}

function suppressNonGameplaySurfaces(win: Window) {
  win.localStorage.setItem(SURVEY_KEY, JSON.stringify(SURVEYS))
  win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  // The science-console coach has dedicated walkthrough coverage. The release
  // matrix captures the working console underneath it, otherwise the overlay
  // hides the data evidence it is meant to audit.
  win.localStorage.setItem('landnam_observatory_coach_seen_v1', '1')
  win.localStorage.setItem('landnam_asteroid_discovery_coach_seen_v1', '1')
  win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
    email: 'release-matrix@example.com',
    password: 'ReleaseMatrix123!',
  }))
}

function continuePastAuthIfShown() {
  cy.get('body').then($body => {
    if ($body.find('[data-testid="auth-gate-quick-email"]').length > 0) {
      cy.get('[data-testid="auth-gate-quick-email"]')
        .should('be.visible')
        .type(`release-${Date.now()}@landnam.test`)
      cy.get('[data-testid="auth-gate-quick-submit"]')
        .should('be.visible')
        .click()
    }
  })
}

function goToMissions() {
  cy.window().then(win => {
    if (win.innerWidth >= 1024) {
      cy.get('[data-testid="bottom-tab-missions"]').should('not.be.visible')
      clickDom('[data-testid="hud-jobs-chip"]')
    } else {
      clickDom('[data-testid="bottom-tab-missions"]')
    }
  })
  cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
}

function completeMiningDeterministically(viewport?: string, captureName?: string, expectDebrief = true) {
  cy.contains('MISSION TRANSIT', { timeout: 20000 }).should('be.visible')
  cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
  if (viewport && captureName) screenshot(viewport, captureName)
  // The real laser interaction has dedicated coverage. This dev-only shortcut
  // keeps the release journey deterministic so it can cover every viewport and
  // still prove the mission/debrief transitions.
  cy.get('[data-testid="dev-skip-mining-btn"]')
    .should('be.visible')
    .click({ force: true })
  // The shortcut fills cargo and begins the return leg. Skip the simulated
  // travel clock, then assert the stable destination rather than a heading
  // that can be present during a leaving transition.
  cy.get('.transit-screen', { timeout: 10000 }).should('be.visible')
  if (!expectDebrief) return
  cy.get('[data-testid="transit-skip-btn"]', { timeout: 10000 })
    .should('be.visible')
    .click({ force: true })
  cy.get('.debrief-screen', { timeout: 15000 }).should('be.visible')
}

function completeM3Delivery(viewport: string) {
  cy.get('.transit-screen', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm3-delivery-transit')
  cy.get('[data-testid="transit-skip-btn"]', { timeout: 10000 }).click({ force: true })
  cy.get('[data-testid="delivery-screen"]', { timeout: 15000 }).should('be.visible')
  cy.get('[data-testid="delivery-cargo-hold"]', { timeout: 15000 }).should('be.visible')
  cy.get('body').then($body => {
    if ($body.find('[data-testid="coach-got-it-btn"]').length > 0) {
      cy.get('[data-testid="coach-got-it-btn"]').click({ force: true })
    }
  })
  cy.get('[data-testid="delivery-screen"] canvas[aria-label]', { timeout: 15000 }).should('be.visible')
  // The interactive dropoff renderer paints asynchronously. Capture a real
  // scene frame rather than the empty mount shell immediately after routing.
  cy.wait(1500)
  screenshot(viewport, 'm3-delivery')
  cy.get('[data-testid="delivery-dump-cargo"]', { timeout: 15000 }).click({ force: true })
  cy.get('.transit-screen', { timeout: 15000 }).should('be.visible')
  cy.get('[data-testid="transit-skip-btn"]', { timeout: 10000 }).click({ force: true })
  cy.get('.debrief-screen', { timeout: 15000 }).should('be.visible')
}

function completeDebrief() {
  clickDom('[data-testid="resolve-cargo-btn"]')
  cy.contains('Payout').should('be.visible')
  clickDom('[data-testid="collect-reward-btn"]')
  cy.contains('h1', 'Earth Base', { timeout: 10000 }).should('be.visible')
}

function captureExtendedSurfaces(viewport: typeof VIEWPORTS[number]) {
  for (const surface of EXTENDED_SURFACES) {
    cy.visit(`/game/${surface.screen}?preset=${surface.key}`, {
      onBeforeLoad(win) {
        win.localStorage.clear()
        suppressNonGameplaySurfaces(win)
      },
    })
    cy.get(surface.selector, { timeout: 15000 }).should('be.visible')
    if ('readySelector' in surface) {
      cy.get(surface.readySelector, { timeout: 15000 }).should('be.visible')
    }
    screenshot(viewport.label, surface.name)
  }
}

function pickVisibleTarget(name: string) {
  cy.get('[data-testid="target-picker-orbital-map"]', { timeout: 10000 }).should('be.visible')
  cy.get(`[data-testid="target-picker-orbital-map"] svg g[role="button"][aria-label="Select ${name}"]`)
    .should('be.visible')
    .click({ force: true })
  cy.window().then(win => {
    if (win.innerWidth < 821) {
      cy.get('[data-testid="target-detail-expand"]').should('contain.text', name)
    } else {
      cy.get('.mission-setup-card').should('contain.text', name)
    }
  })
}

function assertRocketLayout(action: RegExp | string) {
  cy.get('.rocket-vehicle-frame').should('be.visible')
  cy.get('.rocket-tier-badge').should('be.visible')
  cy.get('button', { timeout: 10000 }).contains(action).should('be.visible')
  cy.get('body').then(body => {
    const notice = body.find('.rocket-route-notice')
    if (notice.length === 0) return
    cy.get('.rocket-vehicle-frame').then(frame => {
      expect(notice[0].getBoundingClientRect().bottom).to.be.at.most(frame[0].getBoundingClientRect().top + 1)
    })
  })
}

function playM1(viewport: string) {
  goToMissions()
  screenshot(viewport, 'm1-mission-board')

  cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]')
    .scrollIntoView()
    .should('be.visible')
    .click({ force: true })
  cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm1-target-picker')

  pickVisibleTarget('433 Eros')
  clickDom('[data-testid="continue-build-btn"]')
  cy.contains('Select Rocket', { timeout: 10000 }).should('be.visible')
  assertRocketLayout('Launch with Explorer')
  screenshot(viewport, 'm1-rocket-selection')

  clickButton('Launch with Explorer')
  clickDom('[data-testid="launch-btn"]')
  completeMiningDeterministically(viewport, 'm1-mining')
  completeDebrief()
  screenshot(viewport, 'm1-complete')
}

function playM2(viewport: string) {
  goToMissions()
  screenshot(viewport, 'm2-mission-board')

  cy.get('[data-testid="mission-card-generated-s2-starter-bulk-4"]')
    .scrollIntoView()
    .should('be.visible')
    .click({ force: true })
  cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm2-target-picker')

  pickVisibleTarget('101955 Bennu')
  clickDom('[data-testid="continue-build-btn"]')
  cy.contains('Select Rocket', { timeout: 10000 }).should('be.visible')
  assertRocketLayout(/Purchase/)
  screenshot(viewport, 'm2-rocket-selection')

  cy.contains('button', /Purchase/).first().should('be.visible').click({ force: true })
  clickDom('[data-testid="launch-btn"]')
  completeMiningDeterministically(viewport, 'm2-mining')
  completeDebrief()
  screenshot(viewport, 'm2-complete')
}

function playM3(viewport: string) {
  goToMissions()
  screenshot(viewport, 'm3-mission-board')

  cy.get('[data-testid="mission-card-lnm_m3_relay_bennu_vesta"]')
    .scrollIntoView()
    .should('be.visible')
    .click({ force: true })
  cy.contains('Select Rocket', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm3-rocket-selection')
  cy.get('body').then($body => {
    if ($body.find('[data-testid="coach-got-it-btn"]').length > 0) {
      cy.get('[data-testid="coach-got-it-btn"]').click({ force: true })
    }
  })
  cy.contains('button', /Purchase/).first().should('be.visible').click({ force: true })
  cy.get('body').then($body => {
    if ($body.find('[data-testid="coach-got-it-btn"]').length > 0) {
      cy.get('[data-testid="coach-got-it-btn"]').click({ force: true })
    }
  })
  clickDom('[data-testid="launch-btn"]')
  completeMiningDeterministically(viewport, 'm3-mining', false)
  completeM3Delivery(viewport)
  screenshot(viewport, 'm3-debrief')
  completeDebrief()
  screenshot(viewport, 'm3-complete')
}

describe('Release journey — onboarding and late-game operations across viewport classes', () => {
  for (const viewport of activeViewports) {
    it(`${viewport.label}: completes active onboarding with visible interactions`, () => {
      cy.viewport(viewport.width, viewport.height)
      cy.visit('/game/intro', {
        onBeforeLoad(win) {
          win.localStorage.clear()
          suppressNonGameplaySurfaces(win)
        },
      })

      continuePastAuthIfShown()
      cy.get('h1.intro-title', { timeout: 10000 }).should('be.visible').and('have.text', 'LANDNAM')
      screenshot(viewport.label, 'intro')

      if (viewport.width > viewport.height && viewport.width < 1000) {
        cy.get('[data-testid="portrait-required-overlay"]').should('be.visible')
        screenshot(viewport.label, 'portrait-required')
        return
      }

      cy.get('[data-testid="intro-begin-btn"]').should('be.visible').click()
      cy.contains('EARTH BASE · SETUP', { timeout: 10000 }).should('be.visible')
      screenshot(viewport.label, 'base-setup')

      cy.get('[data-testid="build-plot-0"]').should('be.visible').click()
      cy.contains('button', 'Confirm · Build Here').should('be.visible').click()
      cy.contains('h1', 'Earth Base', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="building-launchpad"]').should('be.visible')
      screenshot(viewport.label, 'base-ready')

      playM1(viewport.label)
      playM2(viewport.label)
      playM3(viewport.label)

      cy.window().then(win => {
        const state = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as {
          screen?: string
          player?: { missionsDone?: number; activeMission?: unknown }
        }
        expect(state.screen, 'final screen').to.eq('hub')
        expect(state.player?.missionsDone, 'completed active missions').to.eq(3)
        expect(state.player?.activeMission, 'no mission left in flight').to.eq(null)
      })
      screenshot(viewport.label, 'end-of-active-content')
      captureExtendedSurfaces(viewport)
    })
  }
})
