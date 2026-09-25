// E2E coverage for FreeOpsBuildScreen (KES-133, part of the post-tutorial
// mechanic audit in KES-126): this is the main post-tutorial entry point
// into the Build flow (/game/fab with no mission/target selected), but it
// shipped with zero test coverage and no in-game rationale for the two
// paths (own-program vs. client work). This spec covers both paths
// rendering, navigation out of the screen, and the new FreeOpsBuildCoach.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const COACH_KEY = 'landnam_free_ops_build_coach_seen_v1'

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

function visitFab(playerOverrides: Partial<GameState['player']> = {}, coachSeen = false) {
  const full: GameState = {
    screen: 'fab',
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

  cy.visit('/game/fab', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
      if (coachSeen) {
        win.localStorage.setItem(COACH_KEY, '1')
      } else {
        win.localStorage.removeItem(COACH_KEY)
      }
    },
  })
}

describe('Free Ops Build screen', () => {
  it('renders both the own-operation and client-work paths with no mission/target selected', () => {
    visitFab({}, true)
    cy.get('[data-testid="free-ops-build-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Start with an objective').should('be.visible')
    cy.contains('Your own operation').should('be.visible')
    cy.contains('Build Infrastructure').should('be.visible')
    cy.contains('Choose Mining').should('be.visible')
    cy.contains('Client work').should('be.visible')
    cy.contains('Browse Client Missions').should('be.visible')
  })

  it('routes "Choose Mining" and "Browse Client Missions" to the Mission Board', () => {
    visitFab({}, true)
    cy.get('[data-testid="free-ops-build-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Choose Mining').click()
    cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
  })

  it('shows the FreeOpsBuildCoach on first visit, walks all 3 steps, then dismisses and persists', () => {
    visitFab({}, false)
    cy.get('[data-testid="free-ops-build-screen"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="free-ops-build-coach"]')
      .should('be.visible')
      .within(() => {
        cy.contains('BUILD HAS TWO PATHS').should('be.visible')
        cy.get('[data-testid="free-ops-build-coach-next"]').click()
        cy.contains('YOUR OWN OPERATION').should('be.visible')
        cy.get('[data-testid="free-ops-build-coach-next"]').click()
        cy.contains('CLIENT WORK').should('be.visible')
        cy.get('[data-testid="free-ops-build-coach-next"]').click()
      })
    cy.get('[data-testid="free-ops-build-coach"]').should('not.exist')
    cy.window().then(win => {
      expect(win.localStorage.getItem(COACH_KEY)).to.eq('1')
    })
  })

  it('does not show the coach again on a second visit once dismissed', () => {
    visitFab({}, true)
    cy.get('[data-testid="free-ops-build-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="free-ops-build-coach"]').should('not.exist')
  })
})
