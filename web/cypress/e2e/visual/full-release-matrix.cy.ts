import { assertOnHome } from '../../support/home-helpers'
export {}

import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

// Release-gate journey (opt-in: CYPRESS_PROFILE=visual-extended).
// Not part of the per-push Visual QA playthrough (SSL-294).
// A fresh player completes the active onboarding path at every supported
// layout class. A second, deterministic surface pass records the late-game
// operations that are not yet part of that onboarding route.
// Screenshots are evidence of visible state; assertions after interactions
// prove the route progressed.

const STORAGE_KEY = 'landnam-game-state-v1'
const AUTHENTICATED_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-user`
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
  { key: 'transport-mining', screen: 'mining', name: 'transport-mining', selector: '[data-testid="mining-canvas"]' },
  { key: 'transport-debrief', screen: 'debrief', name: 'transport-debrief', selector: '.debrief-game' },
  { key: 'ui-mission-board', screen: 'missions', name: 'free-ops-mission-board', selector: '[data-testid="mission-board-section-client"]' },
  { key: 'ui-rover-mining', screen: 'rover-mining', name: 'free-ops-rover-mining', selector: '[data-testid="rover-mining-screen"]' },
  { key: 'telescope-fab', screen: 'fab', name: 'telescope-launch-fab', selector: '[data-testid="mission-launch-review"]' },
  { key: 'telescope-transit', screen: 'transit', name: 'telescope-launch-transit', selector: '.transit-screen' },
  { key: 'telescope-debrief', screen: 'debrief', name: 'telescope-launch-debrief', selector: '.debrief-game' },
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
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext',
        'lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext',
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

function rollOutToLaunchpad() {
  // SSL-450: preparing the vehicle and rolling it to the pad is one action on the launch review.
  cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('be.visible')
  cy.get('body').then($body => {
    if ($body.find('[data-testid="prepare-launch-btn"]').length) clickDom('[data-testid="prepare-launch-btn"]')
  })
  cy.get('[data-testid="launch-btn"]', { timeout: 10000 }).should('be.visible')
}

function suppressNonGameplaySurfaces(win: Window) {
  win.localStorage.setItem(SURVEY_KEY, JSON.stringify(SURVEYS))
  win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  // The science-console coach has dedicated walkthrough coverage. The release
  // matrix captures the working console underneath it, otherwise the overlay
  // hides the data evidence it is meant to audit.
  win.localStorage.setItem('landnam_observatory_coach_seen_v1', '1')
  win.localStorage.setItem('landnam_asteroid_discovery_coach_seen_v1', '1')
  // The normal shell derives its storage namespace from PocketBase's restored
  // user record. Seed a valid-shaped fixture record, not retired credentials,
  // so the fresh intro and every state transition stay in one account slot.
  seedAuthenticatedFixture(win, { screen: 'intro' }, 'e2e-user')
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
  clickDom('[data-testid="home-bar-switch"]')
  cy.get('[data-testid="mission-board-section-client"]', { timeout: 10000 }).should('be.visible')
}

// Transport missions go straight from surface work to the return transit;
// lander missions show the landing hand-off first. Handle whichever is real.
function continueThroughLandingIfShown() {
  cy.get('[data-testid="landing-screen"], .transit-screen', { timeout: 15000 }).should('exist')
  cy.get('body').then($body => {
    if ($body.find('[data-testid="landing-screen"]').length > 0) {
      cy.get('[data-testid="landing-continue"]', { timeout: 15000 }).should('not.be.disabled').click({ force: true })
    }
  })
}

function completeMiningDeterministically(viewport?: string, captureName?: string, expectDebrief = true) {
  // The transit can pass between polls on fast viewports, so accept it or any surface it hands off to.
  cy.get('.transit-screen, [data-testid="mining-canvas"], [data-testid="landing-screen"], [data-testid="rover-mining-screen"]', { timeout: 20000 }).should('exist')
  cy.get('[data-testid="mining-canvas"], [data-testid="landing-screen"], [data-testid="rover-mining-screen"]', { timeout: 20000 }).should('exist')
  cy.get('body').then($body => {
    if ($body.find('[data-testid="mining-canvas"]').length > 0) {
      cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
      if (viewport && captureName) screenshot(viewport, captureName)
      // The real laser interaction has dedicated coverage. This dev-only shortcut
      // keeps the release journey deterministic so it can cover every viewport and
      // still prove the mission/debrief transitions.
      cy.get('[data-testid="dev-skip-mining-btn"]')
        .should('be.visible')
        .click({ force: true })
    } else if ($body.find('[data-testid="landing-screen"]').length > 0) {
      // Lander-equipped missions enter the authored descent scene directly;
      // their surface work is completed below through the rover shortcut.
      cy.get('[data-testid="landing-screen"]', { timeout: 15000 }).should('be.visible')
    }
  })
  // Lander-equipped missions now show the authored surface handoff before
  // rover work. Keep the release journey aligned with that real route while
  // retaining the old direct-transit path for missions without a lander.
  cy.get('body', { timeout: 15000 }).then($body => {
    if ($body.find('[data-testid="rover-mining-screen"]').length > 0) {
      cy.get('[data-testid="deploy-surface-ops-confirm"]', { timeout: 15000 }).then($deploy => {
        if ($deploy.is(':visible')) cy.wrap($deploy).click({ force: true })
      })
      cy.get('[data-testid="dev-skip-rover-mining-btn"]', { timeout: 15000 }).click({ force: true })
      continueThroughLandingIfShown()
    }
    if ($body.find('[data-testid="landing-screen"]').length > 0) {
      cy.get('[data-testid="landing-continue"]', { timeout: 15000 }).should('not.be.disabled').click({ force: true })
      cy.get('[data-testid="rover-mining-screen"]', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid="deploy-surface-ops-confirm"]', { timeout: 15000 }).then($deploy => {
        if ($deploy.is(':visible')) cy.wrap($deploy).click({ force: true })
      })
      cy.get('[data-testid="dev-skip-rover-mining-btn"]', { timeout: 15000 }).click({ force: true })
      continueThroughLandingIfShown()
    }
  })
  // The shortcut fills cargo and begins the return leg. Skip the simulated
  // travel clock, then assert the stable destination rather than a heading
  // that can be present during a leaving transition.
  cy.get('.transit-screen', { timeout: 15000 }).should('be.visible')
  if (!expectDebrief) return
  cy.get('[data-testid="transit-skip-btn"]', { timeout: 10000 })
    .should('be.visible')
    .click({ force: true })
  cy.get('.debrief-game', { timeout: 15000 }).should('be.visible')
}

function completeM3Delivery(viewport: string) {
  cy.get('.transit-screen', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm3-delivery-transit')
  cy.get('[data-testid="transit-skip-btn"]', { timeout: 10000 }).click({ force: true })
  cy.get('[data-testid="delivery-screen"]', { timeout: 15000 }).should('be.visible')
  cy.get('[data-testid="delivery-cargo-hold"]', { timeout: 15000 }).should('be.visible')
  cy.get('body').then($body => {
    if ($body.find('[data-testid="flight-plan-continue"]').length > 0) {
      cy.get('[data-testid="flight-plan-continue"]').click({ force: true })
    }
  })
  cy.get('[data-testid="delivery-screen"] canvas[aria-label]', { timeout: 15000 }).should('be.visible')
  // The interactive dropoff renderer paints asynchronously. Capture a real
  // scene frame rather than the empty mount shell immediately after routing.
  cy.wait(1500)
  screenshot(viewport, 'm3-delivery')
  cy.get('[data-testid="delivery-dump-cargo"]', { timeout: 15000 }).click({ force: true })
  cy.get('[data-testid="delivery-return-rover"]', { timeout: 15000 }).should('be.visible').click({ force: true })
  cy.get('.transit-screen', { timeout: 15000 }).should('be.visible')
  cy.get('[data-testid="transit-skip-btn"]', { timeout: 10000 }).click({ force: true })
  cy.get('.debrief-game', { timeout: 15000 }).should('be.visible')
}

function completeDebrief(destination: 'home' | 'scan-step' = 'home') {
  // Debrief is an explicit player recovery step before rewards can be
  // collected. This keeps the visual journey aligned with the live cargo
  // teardown rather than assuming the retired auto-resolve behavior.
  cy.get('[data-testid="resolve-cargo-btn"]').should('be.visible').click({ force: true })
  // The dismantle scene is player-visible and can be skipped. Use that live
  // affordance instead of racing its renderer before asking for the payout.
  cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 })
    .should('be.visible')
    .click({ force: true })
  cy.contains('Ledger').scrollIntoView().should('be.visible')
  clickDom('[data-testid="collect-reward-btn"]')
  if (destination === 'scan-step') {
    // SSL-408: after the first mining debrief the scan try is next, so the
    // player lands on the Flight Plan scan step rather than Base.
    cy.location('pathname', { timeout: 10000 }).should('include', '/game/galaxy')
    cy.visit('/game/hub')
  }
  assertOnHome(10000)
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
      // Short landscape phones scroll the discovery card, so bring the provenance line into view first.
      cy.get(surface.readySelector, { timeout: 15000 }).scrollIntoView().should('be.visible')
    }
    screenshot(viewport.label, surface.name)
  }
}

function pickVisibleTarget(name: string) {
  // The contract preselects its target; the review names it inline.
  cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('contain', name)
}

function assertRocketLayout(action: RegExp | string) {
  cy.get('[data-testid="mission-launch-review"]').should('be.visible')
  cy.get('[data-testid="prepare-launch-btn"], [data-testid="launch-btn"]', { timeout: 10000 }).contains(action).should('be.visible')
}

function playM1(viewport: string) {
  goToMissions()
  screenshot(viewport, 'm1-mission-board')

  cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]')
    .scrollIntoView()
    .should('be.visible')
    .click({ force: true })
  cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm1-target-picker')

  pickVisibleTarget('433 Eros')
  assertRocketLayout(/PREPARE|BUILD|LAUNCH/)
  screenshot(viewport, 'm1-rocket-selection')

  rollOutToLaunchpad()
  clickDom('[data-testid="launch-btn"]')
  // The dev launch cinematic is intentionally asynchronous. Skip it here so
  // this release matrix tests the post-launch route deterministically instead
  // of spending the whole timeout waiting for the watchdog to fire.
  cy.get('[data-testid="launch-sequence-skip-btn"]', { timeout: 10000 })
    .should('be.visible')
    .click({ force: true })
  completeMiningDeterministically(viewport, 'm1-mining')
  completeDebrief('scan-step')
  screenshot(viewport, 'm1-complete')
}

function playM2(viewport: string) {
  goToMissions()
  screenshot(viewport, 'm2-mission-board')

  cy.get('[data-testid="mission-accept-lnm_m3_relay_bennu_vesta"]')
    .scrollIntoView()
    .should('be.visible')
    .click({ force: true })
  cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm2-rocket-selection')
  cy.get('body').then($body => {
    if ($body.find('[data-testid="flight-plan-continue"]').length > 0) {
      cy.get('[data-testid="flight-plan-continue"]').click({ force: true })
    }
  })
  cy.get('body').then($body => {
    if ($body.find('[data-testid="flight-plan-continue"]').length > 0) {
      cy.get('[data-testid="flight-plan-continue"]').click({ force: true })
    }
  })
  rollOutToLaunchpad()
  clickDom('[data-testid="launch-btn"]')
  cy.get('[data-testid="launch-sequence-skip-btn"]', { timeout: 10000 })
    .should('be.visible')
    .click({ force: true })
  completeMiningDeterministically(viewport, 'm2-mining', false)
  completeM3Delivery(viewport)
  screenshot(viewport, 'm2-debrief')
  completeDebrief('scan-step')
  screenshot(viewport, 'm2-complete')
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
      cy.get('[data-testid="intro-title"]', { timeout: 10000 }).should('be.visible').and('have.text', 'LANDNAM')
      screenshot(viewport.label, 'intro')

      cy.get('[data-testid="intro-begin-btn"]').should('be.visible').click({ force: true })
      // The eyebrow is hidden on compact landscape by design, so check it exists.
      cy.contains('BASE · SETUP', { timeout: 10000 }).should('exist')
      screenshot(viewport.label, 'base-setup')

      cy.get('[data-testid="build-plot-0"]').should('be.visible').click()
      cy.contains('button', 'Confirm · Build Here').should('be.visible').click()
      cy.get('h1', { timeout: 10000 }).invoke('text').should('match', /^(Base|Subsurface)$/)
      cy.get('[data-testid="building-launchpad"]').should('be.visible')
      screenshot(viewport.label, 'base-ready')

      playM1(viewport.label)
      playM2(viewport.label)

      cy.window().then(win => {
        const state = JSON.parse(win.localStorage.getItem(AUTHENTICATED_STORAGE_KEY) || win.localStorage.getItem(STORAGE_KEY) || '{}') as {
          screen?: string
          player?: { missionsDone?: number; activeMission?: unknown }
        }
        expect(state.screen, 'final screen').to.eq('hub')
        expect(state.player?.missionsDone, 'completed active missions').to.eq(2)
        expect(state.player?.activeMission, 'no mission left in flight').to.eq(null)
      })
      screenshot(viewport.label, 'end-of-active-content')
      captureExtendedSurfaces(viewport)
    })
  }
})
