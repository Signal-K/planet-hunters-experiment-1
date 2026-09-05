// KES-128: the Deep Space Telescope previously unlocked its build slot off a
// bare numeric threshold (deepSpaceTelescopeUnlocked — SMS lvl2 + a client at
// affinity lvl2) with no mission and no coach, unlike the Transit Telescope's
// story-mission on-ramp + ObservatoryCoach treatment. This spec covers the
// new story-deep-space-telescope-survey mission gating the build slot, and
// the new AsteroidDiscoveryCoach — beyond mission-type-matrix.cy.ts's
// existing (mission-bypassing) build-gate/classify coverage.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const AUTHENTICATED_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-user`
const COACH_KEY = 'landnam_asteroid_discovery_coach_seen_v1'

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 9_000_000_000,
    activeMission: null,
    missionCount: 4,
    pendingLaunch: false,
    placed: ['launchpad', 'transit-telescope'],
    placementPlots: { launchpad: 0, 'transit-telescope': 1 },
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
    roverDeployments: [],
    clientTerritories: {},
    transitSatelliteLaunchedAt: Date.now() - 60_000,
    transitSatelliteLevel: 2,
    tessClassifications: {},
    deepSpaceTelescopeBuilt: false,
    deepSpaceTelescopeMissionCompletedAt: null,
    asteroidClassifications: {},
    ...overrides,
  } as GameState['player']
}

function visitWithState(path: string, screen: GameState['screen'], playerOverrides: Partial<GameState['player']> = {}) {
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
      win.localStorage.setItem(AUTHENTICATED_STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

function openBuildFromHub(playerOverrides: Partial<GameState['player']> = {}) {
  // Build is guarded for an already-populated Free Ops base; this fixture is
  // intentionally an empty build scene so the catalog can be inspected.
  visitWithState('/game/build', 'build', {
    placed: [],
    placementPlots: {},
    ...playerOverrides,
  })
}

describe('Asteroid Discovery mission on-ramp (KES-128)', () => {
  it('offers the survey mission at Launchpad once the SMS/affinity threshold is met', () => {
    visitWithState('/game/launchpad', 'launchpad', {
      clientMissions: { 'earthbound-minerals': 10 },
    })
    cy.get('[data-testid="launchpad-new-mission-btn"]', { timeout: 10000 }).click()
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]').click()
    cy.get('[data-testid="launchpad-prepare-instrument-btn"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'Survey')
  })

  it('does not offer the survey mission below the SMS/affinity threshold', () => {
    visitWithState('/game/launchpad', 'launchpad', {
      clientMissions: {},
    })
    cy.contains('Deep Space Telescope').should('not.exist')
  })

  it('keeps Deep Space Telescope locked at Build/Place until the survey mission is completed', () => {
    openBuildFromHub({
      clientMissions: { 'earthbound-minerals': 10 },
      deepSpaceTelescopeMissionCompletedAt: null,
    })
    cy.contains('button', 'Deep Space Telescope', { timeout: 10000 }).scrollIntoView()
    cy.wait(1500)
    cy.contains('button', 'Deep Space Telescope', { timeout: 10000 })
      .should('be.visible')
      .and('be.disabled')
      .and('contain.text', 'Transit telescope level 2 and affinity level 2 with a client')
  })

  it('unlocks Deep Space Telescope at Build/Place once the survey mission is completed', () => {
    openBuildFromHub({
      clientMissions: { 'earthbound-minerals': 10 },
      deepSpaceTelescopeMissionCompletedAt: Date.now(),
      stash: { aluminium: 100, copper: 100, silicon: 100 },
    })
    // The catalog re-renders once the async fetch settles (falls back to
    // STATIC_CATALOG against this offline profile), which can detach and
    // replace this button mid-chain — matching the hydration race documented
    // in scan-station.cy.ts. Give it a beat before asserting.
    cy.wait(1500)
    cy.contains('button', 'Deep Space Telescope', { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible')
      .and('not.be.disabled')
  })
})

const MOCK_CANDIDATE = {
  id: 'neocp-2026-b7',
  temp_desig: 'P22cd4E',
  score: 74,
  discovery_date: '2026-08-02',
  ra: 8.1122,
  decl: 11.09,
  v_mag: 20.4,
  h_mag: 23.5,
  n_obs: 4,
  arc_days: 0.28,
  last_seen_days: 0.4,
  resolved: false,
}

function interceptCandidates() {
  cy.intercept('GET', '**/api/collections/asteroid_candidates/records*', {
    statusCode: 200,
    body: { page: 1, perPage: 500, totalItems: 1, totalPages: 1, items: [MOCK_CANDIDATE] },
  }).as('asteroidCandidates')
}

describe('AsteroidDiscoveryCoach (KES-128)', () => {
  it('shows the coach on first visit once the telescope is built, walks all 3 steps, then persists dismissal', () => {
    interceptCandidates()
    visitWithState('/game/asteroid-discovery', 'asteroid-discovery', {
      deepSpaceTelescopeBuilt: true,
      deepSpaceTelescopeMissionCompletedAt: Date.now(),
    })

    cy.get('[data-testid="asteroid-discovery-screen"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="asteroid-discovery-coach"]').should('be.visible')
    cy.contains('A REAL UNCONFIRMED OBJECT FEED').should('be.visible')
    cy.get('[data-testid="asteroid-discovery-coach-next"]').click()
    cy.contains('YOUR CALL FEEDS FOLLOW-UP').should('be.visible')
    cy.get('[data-testid="asteroid-discovery-coach-next"]').click()
    cy.contains('FLAG, MARK, OR SKIP').should('be.visible')
    cy.get('[data-testid="asteroid-discovery-coach-next"]').click()
    cy.get('[data-testid="asteroid-discovery-coach"]').should('not.exist')
    cy.window().then(win => {
      expect(win.localStorage.getItem(COACH_KEY)).to.eq('1')
    })
  })

  it('does not show the coach again on a second visit once dismissed', () => {
    interceptCandidates()
    visitWithState('/game/asteroid-discovery', 'asteroid-discovery', {
      deepSpaceTelescopeBuilt: true,
      deepSpaceTelescopeMissionCompletedAt: Date.now(),
    })
    cy.window().then(win => win.localStorage.setItem(COACH_KEY, '1'))
    cy.visit('/game/asteroid-discovery')
    cy.get('[data-testid="asteroid-discovery-screen"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="asteroid-discovery-coach"]').should('not.exist')
  })
})
