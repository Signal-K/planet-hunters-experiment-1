// E2E coverage for the Astronaut Academy (KES-127, part of the post-tutorial
// mechanic audit in KES-126): the mission on-ramp already existed
// (story-astronaut-academy) and was system-tested (AcademySystem.test.ts),
// but the screen itself had zero e2e coverage and no in-game explanation.
// This spec covers the mission-board on-ramp, the pre-build mission card,
// the built management view, tab switching, and the new AcademyCoach.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const COACH_KEY = 'landnam_academy_coach_seen_v1'

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 9_000_000_000,
    activeMission: null,
    missionCount: 4,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 4,
    freeOperations: true,
    clientMissions: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    ...overrides,
  } as GameState['player']
}

function visitWithState(path: string, screen: GameState['screen'], playerOverrides: Partial<GameState['player']>) {
  const full: GameState = {
    screen,
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: basePlayer(playerOverrides),
  } as GameState

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
      // Player already crossed the M1-M3 -> Free Ops threshold in this
      // fixture — acknowledge the one-time "Program Online" interstitial
      // so it doesn't cover the screen under test (see TutorialCompleteSheet.tsx).
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

function visitHubWithState(playerOverrides: Partial<GameState['player']>) {
  visitWithState('/game', 'hub', playerOverrides)
}

describe('Astronaut Academy', () => {
  // Like the transit telescope, this is a player-owned "Your Program"
  // operation reached from the Launchpad screen (LaunchpadScreen.tsx's
  // "OPS N" button, gated by ACADEMY_INTRO_MISSION_ID visibility), not a
  // client Mission Board card. That button carries no title text of its
  // own — it just routes to the 'academy' screen, where the real mission
  // brief ("Train the First Astronaut") lives — so the on-ramp is only
  // meaningfully testable end-to-end, by actually clicking it.
  it('the Launchpad OPS button routes to the Train the First Astronaut mission once affinity level 2 is reached with two clients', () => {
    visitWithState('/game/launchpad', 'launchpad', {
      clientMissions: { 'helios-propulsion-depot': 10, 'arcturus-battery-systems': 10 },
      transitSatelliteLaunchedAt: Date.now() - 1000,
    })
    cy.get('[data-testid="launchpad-guide-close"]', { timeout: 10000 }).click()
    cy.get('[data-testid="launchpad-program-operation-btn"]', { timeout: 10000 }).click()
    cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('TRAIN THE FIRST ASTRONAUT').should('be.visible')
    cy.contains('Establish the Academy').should('be.visible')
  })

  it('does not offer the mission before two-client affinity level 2 is reached', () => {
    cy.visit('/game/academy', {
      onBeforeLoad(win) {
        const full: GameState = {
          screen: 'academy',
          missionId: null, targetId: null,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
          lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
          player: basePlayer({ clientMissions: { 'helios-propulsion-depot': 10 } }),
        } as GameState
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
        win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
      },
    })
    cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Client affinity progress: 1/2 trusted partners').should('be.visible')
    cy.contains('button', 'Research Academy').should('not.exist')
  })

  it('pre-build: shows the affinity/research/build steps and gates on research XP', () => {
    cy.visit('/game/academy', {
      onBeforeLoad(win) {
        const full: GameState = {
          screen: 'academy',
          missionId: null, targetId: null,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
          lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
          player: basePlayer({
            clientMissions: { 'helios-propulsion-depot': 10, 'arcturus-battery-systems': 10 },
            academyResearched: false,
            researchXP: 0,
          }),
        } as GameState
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
        win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
      },
    })
    cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Establish the Academy').should('be.visible')
    cy.contains('Research the Academy').should('be.visible')
    // researchXP is 0, so the Research Academy button must be disabled
    cy.contains('button', 'Research Academy').should('be.disabled')
  })

  it('built: renders the management view with tabs, and the AcademyCoach explains it on first visit', () => {
    cy.visit('/game/academy', {
      onBeforeLoad(win) {
        const full: GameState = {
          screen: 'academy',
          missionId: null, targetId: null,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
          lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
          player: basePlayer({
            placed: ['launchpad', 'astronaut-academy'],
            placementPlots: { launchpad: 0, 'astronaut-academy': 1 },
            clientMissions: { 'helios-propulsion-depot': 10, 'arcturus-battery-systems': 10 },
            academyResearched: true,
            academyFunded: true,
            crew: [],
          }),
        } as GameState
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
        win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
        win.localStorage.removeItem(COACH_KEY)
      },
    })

    cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('ACADEMY L').should('be.visible')

    // Coach fires on first visit, walks all 4 steps, then dismisses and persists.
    cy.get('[data-testid="academy-coach"]').should('be.visible')
    cy.contains('FUNDING KEEPS IT RUNNING').should('be.visible')
    cy.get('[data-testid="academy-coach-next"]').click()
    cy.contains('TRAIN OR HIRE').should('be.visible')
    cy.get('[data-testid="academy-coach-next"]').click()
    cy.contains('PUT THEM TO WORK').should('be.visible')
    cy.get('[data-testid="academy-coach-next"]').click()
    cy.contains('GROW THE PROGRAM').should('be.visible')
    cy.get('[data-testid="academy-coach-next"]').click()
    cy.get('[data-testid="academy-coach"]').should('not.exist')
    cy.window().then(win => {
      expect(win.localStorage.getItem(COACH_KEY)).to.eq('1')
    })

    // Tab switching reaches every management surface.
    cy.contains('button', 'training').click()
    cy.contains('Day-long sessions').should('be.visible')
    cy.contains('button', 'hire').click()
    cy.contains('Instant level 3 hires').should('be.visible')
    cy.contains('button', 'staffing').click()
    cy.contains('Refinery').should('be.visible')
    cy.contains('button', 'partners').click()
    cy.contains('Crew Quarters T1').should('be.visible')
  })

  it('does not show the coach again on a second visit once dismissed', () => {
    cy.visit('/game/academy', {
      onBeforeLoad(win) {
        const full: GameState = {
          screen: 'academy',
          missionId: null, targetId: null,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
          lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
          player: basePlayer({
            placed: ['launchpad', 'astronaut-academy'],
            placementPlots: { launchpad: 0, 'astronaut-academy': 1 },
            clientMissions: { 'helios-propulsion-depot': 10, 'arcturus-battery-systems': 10 },
            academyResearched: true,
            academyFunded: true,
            crew: [],
          }),
        } as GameState
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
        win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
        win.localStorage.setItem(COACH_KEY, '1')
      },
    })
    cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="academy-coach"]').should('not.exist')
  })
})
