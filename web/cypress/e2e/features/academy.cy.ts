// E2E coverage for the Astronaut Academy (KES-127, part of the post-tutorial
// mechanic audit in KES-126): the mission on-ramp already existed
// (story-astronaut-academy) and was system-tested (AcademySystem.test.ts),
// but the screen itself had zero e2e coverage and no in-game explanation.
// This spec covers the pre-build mission card, the built management view,
// tab switching, and the AcademyCoach. The on-ramp contract is no longer on
// the mission board (own-program work, deferred with the affinity ladder).

import type { GameState } from '@/game-context'
import { seedAuthenticatedFixture } from '../../support/authenticated-fixture'

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

describe('Astronaut Academy', () => {
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
        seedAuthenticatedFixture(win, full, 'e2e-academy-user')
      },
    })
    cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Client level progress: 1/2 partner programmes').should('be.visible')
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
        seedAuthenticatedFixture(win, full, 'e2e-academy-user')
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
        seedAuthenticatedFixture(win, full, 'e2e-academy-user')
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
    cy.get('[data-testid="academy-tab-training"]').click()
    cy.contains('Day-long sessions').should('be.visible')
    cy.get('[data-testid="academy-tab-hire"]').click()
    cy.contains('Instant level 3 hires').should('be.visible')
    cy.get('[data-testid="academy-tab-staffing"]').click()
    cy.contains('Refinery').should('be.visible')
    cy.get('[data-testid="academy-tab-partners"]').click()
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
        seedAuthenticatedFixture(win, full, 'e2e-academy-user')
        win.localStorage.setItem(COACH_KEY, '1')
      },
    })
    cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="academy-coach"]').should('not.exist')
  })

  // KES-341: compact-landscape rendered regression. The old AcademyCoach
  // absolutely-positioned itself over the top of the 190px scene canvas —
  // these assert the scene keeps real, non-trivial visible height whether
  // the coach is up or dismissed, at both audited compact-landscape sizes.
  const LANDSCAPE_VIEWPORTS = [
    { key: 'landscape-844', width: 844, height: 390 },
    { key: 'landscape-926', width: 926, height: 428 },
  ] as const

  LANDSCAPE_VIEWPORTS.forEach(({ key, width, height }) => {
    it(`[${key}] keeps the academy scene visible and dominant with the coach up, and after dismissal`, () => {
      cy.viewport(width, height)
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
          seedAuthenticatedFixture(win, full, 'e2e-academy-user')
          win.localStorage.removeItem(COACH_KEY)
        },
      })

      cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="academy-coach"]').should('be.visible')
      // The coach reserves its own row (tutorialRail) rather than overlaying
      // the scene, so the scene canvas must still report a real visible height.
      cy.get('[data-testid="academy-canvas"]').then($canvas => {
        expect($canvas.height()).to.be.greaterThan(120)
      })
      cy.get('[data-testid="academy-tab-roster"]').then($tab => {
        // Compact-landscape uses a shortened visible row, but it remains a
        // real, reachable control rather than collapsing out of the scene.
        expect($tab.height()).to.be.at.least(24)
      })

      cy.get('[data-testid="academy-coach-skip"]').click()
      cy.get('[data-testid="academy-coach"]').should('not.exist')
      cy.get('[data-testid="academy-canvas"]').then($canvas => {
        expect($canvas.height()).to.be.greaterThan(120)
      })
      cy.screenshot(`academy-${key}-coach-dismissed`)
    })

    it(`[${key}] keeps crew training actionable from the roster surface`, () => {
      cy.viewport(width, height)
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
          seedAuthenticatedFixture(win, full, 'e2e-academy-user')
          win.localStorage.setItem(COACH_KEY, '1')
        },
      })
      cy.get('[data-testid="academy-screen"]', { timeout: 10000 }).should('be.visible')
      // The current starter state may already include a rostered astronaut;
      // the stable contract is that training remains reachable either way.
      cy.get('[data-testid="academy-tab-training"]').click()
      // Compact landscape scrolls the management panel; reachable by scroll
      // is the contract, not visible without scrolling.
      cy.contains('button', 'Train New Candidate').scrollIntoView().should('be.visible')
    })
  })
})
