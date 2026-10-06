// E2E coverage for FreeOpsBuildScreen (KES-133, part of the post-tutorial
// mechanic audit in KES-126): this is the main post-tutorial entry point
// into the Build flow (/game/fab with no mission/target selected), but it
// shipped with zero test coverage and no in-game rationale for the two
// paths (own-program vs. client work). This spec covers both paths
// rendering, navigation out of the screen, and the new FreeOpsBuildCoach.

import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'

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

function visitFab(playerOverrides: Partial<GameState['player']> = {}) {
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
      seedFixtureSession(win)
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

describe('Free Ops Build screen', () => {
  it('renders both the own-operation and client-work paths with no mission/target selected', () => {
    visitFab({})
    cy.get('[data-testid="free-ops-build-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Start with an objective').should('be.visible')
    cy.contains('Your own operation').should('be.visible')
    cy.contains('Build Infrastructure').should('be.visible')
    cy.contains('Choose Mining').should('be.visible')
    cy.contains('Client work').should('be.visible')
    cy.contains('Browse Client Missions').should('be.visible')
  })

  it('routes "Choose Mining" and "Browse Client Missions" to the Mission Board', () => {
    visitFab({})
    cy.get('[data-testid="free-ops-build-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Choose Mining').click()
    cy.get('[data-testid="mission-setup-scaffold"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="mission-board-section-client"]').should('be.visible')
  })

})
