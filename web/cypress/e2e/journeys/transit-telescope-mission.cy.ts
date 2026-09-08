// E2E coverage for the telescope construction/launch operation that kicks off
// the transit-classification instrument feed. STS-582 keeps the physical
// launch in the flight engine while making it player-owned Launchpad work,
// never a client contract on the Mission Board.

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
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
    },
  })
}

function visitHubWithState(playerOverrides: Partial<GameState['player']>) {
  visitWithState('/game', 'hub', playerOverrides)
}

describe('Telescope construction/launch mission (STS-138)', () => {
  // 2026-08-21 (Liam, direct correction): launching a transit telescope is
  // what TESS citizen science is for, and must be reachable directly —
  // the Transit Telescope is unrelated end-game fleet-management
  // content, not a prerequisite for the first telescope. The three specs
  // below that asserted the old SMS-gates-everything behavior were replaced
  // with specs asserting the telescope mission/TESS screen are NOT gated on
  // `transitSatelliteLaunchedAt` at all (tested false in every case here).

  it('offers telescope deployment under Your Program and never on the Mission Board, with no SMS prerequisite', () => {
    visitHubWithState({ transitSatelliteLaunchedAt: undefined })
    cy.get('[data-testid="progression-card-transit-satellite"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Launch a transit telescope').should('be.visible')
    cy.get('[data-testid="progression-card-transit-satellite"]').click({ force: true })
    cy.contains('Your Program', { timeout: 10000 }).should('be.visible')
    // KES-329/330 replaced the single aggregate OPS button with an explicit
    // mission-menu -> operation-brief flow off the physical launchpad: the
    // telescope is an owned instrument, so it lives behind the
    // "LAUNCH SATELLITE / TOOL" choice, not a per-mission card.
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 10000 }).click({ force: true })
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]', { timeout: 10000 })
      .should('not.be.disabled')
      .click()
    cy.get('[data-testid="launchpad-prepare-instrument-btn"]', { timeout: 10000 }).click()
    // Lands on the target picker (step 2 of 4: Mission -> Target -> Rocket
    // -> Launch) — the telescope mission still requires an explicit target
    // pick even though Earth Orbit is the only compatible target.
    cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')

    visitWithState('/game/missions', 'missions', {
      transitSatelliteLaunchedAt: undefined,
    })
    cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="mission-card-story-transit-telescope-launch"]').should('not.exist')
  })

  it('can start the telescope deployment from the Launchpad with no SMS built', () => {
    visitWithState('/game/launchpad', 'launchpad', {
      transitSatelliteLaunchedAt: undefined,
    })
    // KES-329/330: reach the telescope through the launchpad mission menu's
    // "LAUNCH SATELLITE / TOOL" operation brief, not a per-mission card.
    cy.get('[data-testid="launchpad-status-card"]', { timeout: 10000 })
      .scrollIntoView()
      .click({ force: true })
    cy.get('[data-testid="launchpad-new-mission-satellite-btn"]', { timeout: 10000 })
      .should('not.be.disabled')
      .click()
    cy.get('[data-testid="launchpad-prepare-instrument-btn"]', { timeout: 10000 }).click()
    // Lands on the target picker (step 2 of 4: Mission -> Target -> Rocket
    // -> Launch) — the telescope mission still requires an explicit target
    // pick even though Earth Orbit is the only compatible target.
    cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')
  })

  it('gates the TESS discovery screen behind launching the telescope, with no SMS prerequisite', () => {
    visitWithState('/game/galaxy', 'galaxy', { transitSatelliteLaunchedAt: undefined })
    cy.contains('Launch Transit Telescope', { timeout: 10000 }).should('be.visible')
    cy.contains('Deploy your own telescope from the Launchpad').should('be.visible')
    cy.get('[data-testid="open-transit-telescope-program-btn"]').click({ force: true })
    cy.contains('Your Program', { timeout: 10000 }).should('be.visible')
  })

  it('unlocks the TESS discovery loop once the telescope has launched, with no SMS built', () => {
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
    visitWithState('/game/galaxy', 'galaxy', { transitSatelliteLaunchedAt: Date.now() - 1000 })
    cy.wait('@subjects')
    // STS-582's instrument-feed rename replaced the old "TESS ANOMALY"
    // heading with the TopBar eyebrow below plus the candidate's own TOI id
    // as the title (see tess-discovery-desktop-layout.cy.ts's identical fix).
    cy.contains('INSTRUMENT DATA FEED', { timeout: 15000 }).should('be.visible')
  })
})
