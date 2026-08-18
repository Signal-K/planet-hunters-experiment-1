// Release-gate journey: a fresh player completes the currently active M1/M2
// onboarding path at every supported layout class. Screenshots are evidence of
// the visible state; the assertions after each visible interaction are the
// evidence that the journey actually progressed.

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

const VIEWPORTS = [
  { label: 'mobile-portrait', width: 390, height: 844 },
  { label: 'mobile-landscape', width: 926, height: 428 },
  { label: 'tablet-portrait', width: 768, height: 1024 },
  { label: 'desktop', width: 1280, height: 800 },
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

function suppressNonGameplaySurfaces(win: Window) {
  win.localStorage.setItem(SURVEY_KEY, JSON.stringify(SURVEYS))
  win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({
    email: 'release-matrix@landnam.guest',
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
      cy.get('[data-testid="hud-jobs-chip"]').should('be.visible').click()
    } else {
      cy.get('[data-testid="bottom-tab-missions"]').should('be.visible').click()
    }
  })
  cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
}

function completeMiningDeterministically() {
  cy.contains('MISSION TRANSIT', { timeout: 20000 }).should('be.visible')
  cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
  // The real laser interaction has dedicated coverage. This dev-only shortcut
  // keeps the release journey deterministic so it can cover every viewport and
  // still prove the mission/debrief transitions.
  cy.get('[data-testid="dev-skip-mining-btn"]')
    .should('be.visible')
    .click()
}

function completeDebrief() {
  cy.contains('MISSION COMPLETE', { timeout: 15000 }).should('be.visible')
  cy.get('[data-testid="resolve-cargo-btn"]').should('be.visible').click()
  cy.contains('Payout').should('be.visible')
  cy.get('[data-testid="collect-reward-btn"]').should('be.visible').click()
  cy.contains('h1', 'Earth Base', { timeout: 10000 }).should('be.visible')
}

function pickVisibleTarget(name: string) {
  cy.get('[data-testid="target-picker-orbital-map"]', { timeout: 10000 }).should('be.visible')
  cy.get(`[data-testid="target-picker-orbital-map"] svg g[role="button"][aria-label="Select ${name}"]`)
    .should('be.visible')
    .click()
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
    .click()
  cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm1-target-picker')

  pickVisibleTarget('433 Eros')
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()
  cy.contains('Select Rocket', { timeout: 10000 }).should('be.visible')
  assertRocketLayout('Launch with Explorer')
  screenshot(viewport, 'm1-rocket-selection')

  cy.contains('button', 'Launch with Explorer').should('be.visible').click()
  cy.get('[data-testid="launch-btn"]', { timeout: 10000 }).should('be.visible').click()
  completeMiningDeterministically()
  screenshot(viewport, 'm1-mining')
  completeDebrief()
  screenshot(viewport, 'm1-complete')
}

function playM2(viewport: string) {
  goToMissions()
  screenshot(viewport, 'm2-mission-board')

  cy.get('[data-testid="mission-card-generated-s2-starter-bulk-4"]')
    .scrollIntoView()
    .should('be.visible')
    .click()
  cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')
  screenshot(viewport, 'm2-target-picker')

  pickVisibleTarget('101955 Bennu')
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()
  cy.contains('Select Rocket', { timeout: 10000 }).should('be.visible')
  assertRocketLayout(/Purchase/)
  screenshot(viewport, 'm2-rocket-selection')

  cy.contains('button', /Purchase/).first().should('be.visible').click()
  cy.get('[data-testid="launch-btn"]', { timeout: 10000 }).should('be.visible').click()
  completeMiningDeterministically()
  screenshot(viewport, 'm2-mining')
  completeDebrief()
  screenshot(viewport, 'm2-complete')
}

describe('Release journey — fresh M1/M2 player across viewport classes', () => {
  for (const viewport of VIEWPORTS) {
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

      cy.window().then(win => {
        const state = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as {
          screen?: string
          player?: { missionsDone?: number; activeMission?: unknown }
        }
        expect(state.screen, 'final screen').to.eq('hub')
        expect(state.player?.missionsDone, 'completed active missions').to.eq(2)
        expect(state.player?.activeMission, 'no mission left in flight').to.eq(null)
      })
      screenshot(viewport.label, 'end-of-active-content')
    })
  }
})
