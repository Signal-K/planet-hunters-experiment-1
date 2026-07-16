// E2E coverage for STS-138: the telescope construction/launch mission that
// kicks off the transit-classification (TESS) citizen-science loop.
// The mission itself (story-transit-telescope-launch) and the unlock gate
// on TessDiscoveryScreen were already implemented in game-context.tsx /
// useGameLoop.ts / ProgressionCard.tsx — this file closes the missing E2E
// coverage gap by driving real in-app navigation from the Hub screen.

import type { GameState } from '@/game-context'

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
    contractorMissions: {},
    contractorCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    roverDeployments: [],
    contractorTerritories: {},
    satelliteMonitoringBuilt: false,
    transitSatelliteLaunchedAt: undefined,
    tessClassifications: {},
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
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
    },
  })
}

function visitHubWithState(playerOverrides: Partial<GameState['player']>) {
  visitWithState('/game', 'hub', playerOverrides)
}

describe('Telescope construction/launch mission (STS-138)', () => {
  it('prompts to build the Satellite Monitoring Station before the mission is offered', () => {
    visitHubWithState({ satelliteMonitoringBuilt: false, transitSatelliteLaunchedAt: undefined })
    cy.get('[data-testid="progression-card-sms"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Build a Satellite Monitoring Station').should('be.visible')
    cy.get('[data-testid="progression-card-transit-satellite"]').should('not.exist')
  })

  it('offers the telescope launch mission once the station is built, and it appears on the mission board', () => {
    visitHubWithState({ satelliteMonitoringBuilt: true, transitSatelliteLaunchedAt: undefined })
    cy.get('[data-testid="progression-card-transit-satellite"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Launch a transit telescope').should('be.visible')
    cy.get('[data-testid="progression-card-transit-satellite"]').click({ force: true })
    cy.contains('Launch Transit Telescope', { timeout: 10000 }).should('be.visible')
  })

  it('gates the TESS discovery screen behind the Satellite Monitoring Station', () => {
    visitWithState('/game/galaxy', 'galaxy', { satelliteMonitoringBuilt: false, transitSatelliteLaunchedAt: undefined })
    cy.contains('Place the Earth-base', { timeout: 10000 }).should('be.visible')
  })

  it('gates the TESS discovery screen behind launching the telescope even once the station is built', () => {
    visitWithState('/game/galaxy', 'galaxy', { satelliteMonitoringBuilt: true, transitSatelliteLaunchedAt: undefined })
    cy.contains('Launch Transit Telescope', { timeout: 10000 }).should('be.visible')
    cy.contains('A story mission is available from Mission Control').should('be.visible')
  })

  it('unlocks the TESS discovery loop once the telescope has launched', () => {
    cy.intercept('GET', '**/api/collections/subjects/records*', {
      statusCode: 200,
      body: {
        page: 1,
        perPage: 500,
        totalItems: 1,
        totalPages: 1,
        items: [{
          id: 'subj-toi-1000',
          subject_type: 'transit',
          gold_label: '',
          consensus: '',
          toi_id: '1000.01',
          tic_id: '12345678',
          period_days: 4.2,
          depth_ppm: 1200,
          distance_ly: 150,
          constellation: 'Lyra',
          signal_to_noise: 18,
          planet_radius_earth: 1.4,
        }],
      },
    }).as('subjects')
    visitWithState('/game/galaxy', 'galaxy', { satelliteMonitoringBuilt: true, transitSatelliteLaunchedAt: Date.now() - 1000 })
    cy.wait('@subjects')
    cy.contains('TESS ANOMALY', { timeout: 15000 }).should('be.visible')
  })
})
