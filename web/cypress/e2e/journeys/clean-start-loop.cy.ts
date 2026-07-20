import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

const ALL_SURVEY_KEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_contractor_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
]

function readSavedState() {
  return cy.window().then(win => JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as GameState)
}

describe('Clean start full game loop', () => {
  it('creates a fresh account and plays M1 from intro through debrief', () => {
    const email = `clean_start_${Date.now()}@landnam.test`
    const password = 'CleanStart123!'
    const userRecord = { id: `clean-start-${Date.now()}`, email, name: '' }

    cy.intercept('POST', '**/api/collections/users/records', {
      statusCode: 200,
      body: userRecord,
    }).as('createUser')

    cy.intercept('POST', '**/api/collections/users/auth-with-password', {
      statusCode: 200,
      body: { token: 'clean-start-token', record: userRecord },
    }).as('authUser')

    cy.intercept('GET', '**/api/collections/users/auth-refresh', {
      statusCode: 200,
      body: { token: 'clean-start-token', record: userRecord },
    }).as('refreshUserGet')

    cy.intercept('POST', '**/api/collections/users/auth-refresh', {
      statusCode: 200,
      body: { token: 'clean-start-token', record: userRecord },
    }).as('refreshUserPost')

    cy.intercept('GET', '**/api/collections/game_states/records*', {
      statusCode: 404,
      body: { message: 'not found' },
    }).as('noRemoteState')

    cy.intercept('POST', '**/api/collections/game_states/records', {
      statusCode: 200,
      body: { id: 'clean-start-state', user: userRecord.id, state: {} },
    }).as('createRemoteState')

    cy.intercept('PATCH', '**/api/collections/game_states/records/*', {
      statusCode: 200,
      body: { id: 'clean-start-state', user: userRecord.id, state: {} },
    }).as('updateRemoteState')

    cy.viewport(390, 844)
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEY_KEYS))
        win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
      },
    })

    cy.contains('Welcome Back').should('be.visible')
    cy.contains('button', 'Sign Up').click()
    cy.get('[data-testid="auth-gate-email"]').type(email)
    cy.get('[data-testid="auth-gate-password"]').type(password)
    cy.get('[data-testid="auth-gate-submit"]').click()

    cy.contains('LANDNAM', { timeout: 10_000 }).should('be.visible')
    // The intro title paints before React's state-persistence effect commits
    // its first localStorage.setItem — retry until the write lands instead of
    // reading it as a one-shot right after the DOM assertion above.
    cy.window({ timeout: 10_000 }).should(win => {
      const raw = win.localStorage.getItem(STORAGE_KEY)
      expect(raw, 'persisted game state').to.be.a('string')
      expect(JSON.parse(raw as string).screen).to.eq('intro')
    })
    readSavedState().then(state => {
      expect(state.screen).to.eq('intro')
      expect(state.player.missionsDone).to.eq(0)
      expect(state.player.placed).to.deep.eq([])
    })

    cy.get('[data-testid="intro-begin-btn"]').click()
    cy.contains('EARTH BASE · SETUP').should('be.visible')
    cy.contains('Build a Launchpad').should('be.visible')
    cy.get('[data-testid="build-plot-0"]').click()
    cy.contains('button', 'Confirm · Build Here').click()

    cy.contains('Earth Base', { timeout: 10_000 }).should('be.visible')
    cy.get('[data-testid="building-launchpad"]').should('be.visible')
    cy.get('[data-testid="bottom-tab-missions"]').click()

    cy.contains('Mission Board').should('be.visible')
    cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').click()

    cy.contains('Pick Target').should('be.visible')
    cy.contains('Continue · Build').click()

    cy.contains('Select Rocket').should('be.visible')
    cy.contains('button', 'Launch with Explorer').click()

    cy.contains('Confirm Rocket').should('be.visible')
    cy.get('[data-testid="launch-btn"]').click()

    cy.contains('MISSION TRANSIT').should('be.visible')
    cy.contains('button', /^Arrive$/, { timeout: 12_000 }).click()

    cy.contains('Mining Run', { timeout: 10_000 }).should('be.visible')
    cy.get('[data-testid="mining-canvas"]').should('be.visible')
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="fire-laser-btn"]').click()
      cy.wait(150)
    }
    cy.get('[data-testid="return-home-btn"]').should('not.be.disabled').click()

    cy.contains('Returned', { timeout: 10_000 }).should('be.visible')
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.get('[data-testid="collect-reward-btn"]').click()

    // Still in guided onboarding after M1 — debrief returns to hub, not market.
    // The Prospector unlock is announced inline by the tutorial coach
    // (lib/data/tutorial.ts step 20) instead of the 'sr2' popup, which is
    // suppressed while stillInTutorial is true.
    cy.get('[data-testid="building-launchpad"]', { timeout: 10_000 }).should('be.visible')
    readSavedState().then(state => {
      expect(state.screen).to.eq('hub')
      expect(state.player.missionsDone).to.eq(1)
      expect(state.player.placed).to.include('launchpad')
      expect(state.player.activeMission).to.eq(null)
      expect(state.missionId).to.eq(null)
      expect(state.targetId).to.eq(null)
      expect(state.popup).to.not.eq('sr2')
    })
  })
})
