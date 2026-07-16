import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

const ALL_SURVEY_KEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_contractor_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
]

function startFresh() {
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEY_KEYS))
      win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
    },
  })
}

function savedState() {
  return cy.window().then(win => JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as GameState)
}

function continueWithoutAccountIfShown() {
  cy.get('[data-testid="auth-gate-skip"], [data-testid="intro-begin-btn"]', { timeout: 10000 }).then($el => {
    const skip = $el.filter('[data-testid="auth-gate-skip"]')
    if (skip.length > 0) {
      cy.wrap(skip.first()).click()
      cy.get('[data-testid="auth-gate-skip"]').should('not.exist')
    }
  })
}

function navToMissions() {
  cy.window().then(win => {
    const isDesktop = win.innerWidth >= 1024
    if (isDesktop) {
      cy.get('[data-testid="radial-nav-toggle"]').should('not.be.visible')
      cy.get('[data-testid="sidebar-nav-missions"]').should('be.visible').click()
    } else {
      cy.get('[data-testid="radial-nav-toggle"]').should('be.visible').click()
      cy.get('[data-testid="radial-nav-missions"]').should('be.visible').click()
    }
  })
}

function playM1FromIntro() {
  continueWithoutAccountIfShown()
  cy.contains('LANDNAM', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="intro-begin-btn"]').click({ force: true })

  cy.contains('EARTH BASE · SETUP', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="build-plot-0"]').click()
  cy.contains('button', 'Confirm · Build Here').click()

  cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="building-launchpad"]').should('be.visible')
  navToMissions()

  cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').click()

  cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="target-eros"]').click({ force: true })
  cy.get('[data-testid="continue-build-btn"]').should('be.visible').click()

  cy.contains('Select Rocket', { timeout: 10000 }).should('be.visible')
  cy.contains('button', 'Launch with Explorer').click()

  cy.get('[data-testid="launch-btn"]', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="launch-btn"]').click()

  cy.contains('MISSION TRANSIT', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="mining-canvas"]', { timeout: 20000 }).should('be.visible')
  for (let i = 0; i < 5; i += 1) {
    cy.get('[data-testid="fire-laser-btn"]').should('not.be.disabled').click()
  }
  cy.get('[data-testid="return-home-btn"]').should('not.be.disabled').click()

  cy.contains('MISSION COMPLETE', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="resolve-cargo-btn"]').click()
  cy.get('[data-testid="collect-reward-btn"]').click()

  // Still in guided onboarding after M1 — debrief returns to hub, not market.
  cy.get('[data-testid="building-launchpad"]', { timeout: 10000 }).should('be.visible')
}

describe('Actual local playthroughs', () => {
  it('plays M1 from a fresh mobile account', () => {
    cy.viewport(390, 844)
    startFresh()
    playM1FromIntro()
    savedState().then(state => {
      expect(state.screen).to.eq('hub')
      expect(state.player.missionsDone).to.eq(1)
      expect(state.player.placed).to.include('launchpad')
    })
  })

  it('starts a second fresh desktop account without inheriting the first account state', () => {
    cy.viewport(1280, 800)
    startFresh()
    continueWithoutAccountIfShown()

    cy.window({ timeout: 10000 }).should(win => {
      expect(win.localStorage.getItem(STORAGE_KEY)).to.not.be.null
    })
    savedState().then(state => {
      expect(state.screen).to.eq('intro')
      expect(state.player.missionsDone).to.eq(0)
      expect(state.player.placed).to.deep.eq([])
    })

    playM1FromIntro()
  })
})
