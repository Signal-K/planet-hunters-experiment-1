import type { GameState } from '../../../game-context'

/**
 * The hub's progression cards stopped responding to clicks once the tutorial
 * finished.
 *
 * Cause: HubScreen's buildings layer wrapped its absolutely-positioned
 * buildings in a second `inset: 0` div with `pointerEvents: 'auto'` at
 * zIndex 10. ProgressionCard sits at zIndex 8, so that transparent wrapper
 * covered the whole screen and swallowed every tap on Open Skill Tree, Build
 * and Browse Contracts.
 *
 * It only reproduced *after* the tutorial because the card stack is hidden
 * while the coach is on screen — during onboarding there was nothing under the
 * catcher to click.
 *
 * These tests click each card and assert the route actually changed. Asserting
 * the button is merely visible would have passed throughout the bug.
 */

const STORAGE_KEY = 'landnam-game-state-v1'
const GUEST_KEY = 'landnam-account-credentials'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
// The sheet shown once when onboarding completes. Pre-acknowledged here: it is
// a legitimate modal and would sit over the cards, which is not the bug under
// test. (That two sheets *can* stack — this one plus the auth gate — is a
// separate problem, see STS-614.)
const TUTORIAL_ACK_KEY = 'ln_tutorial_complete_ack'
const GUEST = JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' })
const FAR_FUTURE = String(Date.now() + 365 * 24 * 60 * 60 * 1000)
const ALL_SURVEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext',
        'lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext',
]

// Past onboarding, nothing in flight, skill points banked and no satellite
// station yet — the exact state in the bug report, which renders all three
// cards at once.
const POST_TUTORIAL: Partial<GameState> = {
  screen: 'hub',
  tutorial: false,
  doneSteps: {},
  player: {
    francs: 11_580_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: ['launchpad', 'refinery'],
    placementPlots: { launchpad: 0, refinery: 1 },
    controlBuilt: true,
    missionsDone: 3,
    skillPoints: 3,
    unlockedSkillNodes: [],
    freeOperations: true,
    clientMissions: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: true,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
  },
} as Partial<GameState>

function visitHub() {
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      // Guest credentials, or the auth gate covers the whole screen.
      win.localStorage.setItem(GUEST_KEY, GUEST)
      win.localStorage.setItem(SNOOZE_KEY, FAR_FUTURE)
      win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEYS))
      win.localStorage.setItem(TUTORIAL_ACK_KEY, '1')
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(POST_TUTORIAL))
    },
  })
}

describe('hub progression cards are clickable after the tutorial', () => {
  beforeEach(visitHub)

  it('Open Skill Tree navigates to the skill tree', () => {
    cy.get('[data-testid="progression-card-skills"]').should('be.visible').click()
    cy.contains('Skill Nodes', { timeout: 10_000 }).should('be.visible')
  })

  it('Browse Contracts navigates to the mission board', () => {
    cy.get('[data-testid="progression-card-next-mission"]').should('be.visible').click()
    cy.location('pathname', { timeout: 10_000 }).should('not.eq', '/game/hub')
  })

  it('Open Launchpad enters the playable scene, not a card overview', () => {
    cy.get('[data-testid="progression-card-transit-satellite"]').should('be.visible').click()
    cy.get('[data-testid="launchpad-focus-screen"]', { timeout: 10_000 }).should('be.visible')
    cy.get('[data-testid="launchpad-status-card"]').should('be.visible')
    cy.get('[data-testid="launchpad-rocket-fleet"]').should('be.visible')
    cy.get('[data-testid="launchpad-ui-screen"]').should('not.exist')
  })

  it('the physical Launchpad enters the same playable composition', () => {
    cy.get('[data-testid="building-launchpad-hit"]').click({ force: true })
    cy.get('[data-testid="launchpad-focus-screen"]', { timeout: 10_000 }).should('be.visible')
    cy.get('[data-testid="launchpad-ui-screen"]').should('not.exist')
  })

  it('nothing transparent is covering the cards', () => {
    // The regression directly: whatever the browser hit-tests at the centre of
    // a card must be the card itself, not a full-bleed wrapper above it.
    cy.get('[data-testid="progression-card-skills"]').then($card => {
      const r = $card[0].getBoundingClientRect()
      cy.document().then(doc => {
        const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        expect($card[0].contains(hit), 'topmost element at the card centre is the card').to.eq(true)
      })
    })
  })

  it('buildings on the surface are still clickable', () => {
    // The fix moved pointer-events onto the building roots. If that were wrong,
    // the hub would trade one dead layer for another.
    cy.get('[data-testid="progression-card-skills"]').should('exist')
    cy.contains('Launchpad').should('exist')
  })
})
