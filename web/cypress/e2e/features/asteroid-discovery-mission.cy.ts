// SSL-392: Deep Space Telescope is an owned orbital payload, not an Earth
// structure. A Free Operations player must be able to choose and launch it
// directly from the Launchpad without Transit Telescope or client progression.

import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'
const AUTHENTICATED_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-user`

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
      seedFixtureSession(win, 'e2e-user')
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

describe('Deep Space Telescope launch on-ramp (SSL-392)', () => {
  it('offers Deep Space Telescope next to Transit Telescope and enters its launch flow without either telescope or client progression', () => {
    cy.viewport(390, 844)
    visitWithState('/game/launchpad', 'launchpad', {
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      transitSatelliteLaunchedAt: null,
      transitSatelliteLevel: undefined,
      deepSpaceTelescopeBuilt: false,
      deepSpaceTelescopeLaunchedAt: null,
      clientMissions: {},
    })
    cy.get('[data-testid="launchpad-new-mission-btn"]', { timeout: 10000 }).click()
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled')
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]').click()
    cy.get('[data-testid="launchpad-prepare-instrument-btn"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'Launch Transit Telescope')
    cy.get('[data-testid="launchpad-prepare-instrument-deep-space-telescope"]')
      .scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Launch Deep Space Telescope')
    cy.screenshot('ssl-392-instrument-choices')
    cy.get('[data-testid="launchpad-prepare-instrument-deep-space-telescope"]').click()
    cy.get('[data-testid="mission-launch-review"]', { timeout: 10000 }).should('be.visible')
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

// KES-342: compact-landscape rendered regression. The old AsteroidDiscoveryCoach
// absolutely-positioned itself over the top of the screen; these confirm the
// that the new truthful sky-position
// visualization renders with the real candidate fields, and that verdict
// actions stay reachable at a real touch size through to the saved state.
const LANDSCAPE_VIEWPORTS = [
  { key: 'landscape-844', width: 844, height: 390 },
  { key: 'landscape-926', width: 926, height: 428 },
] as const

describe('Asteroid Discovery compact-landscape visualization (KES-342)', () => {
  LANDSCAPE_VIEWPORTS.forEach(({ key, width, height }) => {
    it(`[${key}] shows the RA/Dec chart in the shared viewport with verdicts in reach`, () => {
      cy.viewport(width, height)
      interceptCandidates()
      visitWithState('/game/asteroid-discovery', 'asteroid-discovery', {
        deepSpaceTelescopeBuilt: true,
        deepSpaceTelescopeLaunchedAt: Date.now(),
      })
      cy.visit('/game/asteroid-discovery')
      cy.get('[data-testid="asteroid-discovery-screen"]', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid="asteroid-sky-plot"]').should('be.visible')
      cy.get('[data-testid="neocp-data-provenance"]').should('be.visible')
      cy.get('[data-testid="instrument-empty-tool"]').should('contain', 'No tool')
      cy.contains('H Mag').should('not.exist')
      cy.get('[data-testid="neocp-more-data-toggle"]').should('not.exist')
      cy.get('[data-testid="neocp-verdict-likely_real"]').then($button => {
        const rect = $button[0].getBoundingClientRect()
        expect(rect.bottom, 'verdict bottom edge').to.be.at.most(height)
        expect(rect.height, 'verdict hit area').to.be.at.least(44)
      })
    })

    it(`[${key}] reaches the verdict-ready state after casting a call`, () => {
      cy.viewport(width, height)
      interceptCandidates()
      visitWithState('/game/asteroid-discovery', 'asteroid-discovery', {
        deepSpaceTelescopeBuilt: true,
        deepSpaceTelescopeLaunchedAt: Date.now(),
      })
      cy.visit('/game/asteroid-discovery')
      cy.get('[data-testid="asteroid-discovery-screen"]', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid="neocp-verdict-likely_artifact"]').click()
      cy.contains('ANNOTATION SAVED').should('be.visible')
    })
  })
})
