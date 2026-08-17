import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

type GameStateOverride = Omit<Partial<GameState>, 'player'> & {
  player?: Partial<GameState['player']>
}

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 15_000_000_000,
    activeMission: null,
    missionCount: 4,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 3,
    skillPoints: 0,
    unlockedSkillNodes: [],
    freeOperations: true,
    clientMissions: {},
    clientStreaks: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryUnlocked: false,
    refineryUnlockNotified: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    seen_planets: [],
    roverDeployments: [],
    clientTerritories: {},
    satelliteMonitoringBuilt: true,
    satelliteMonitoringLevel: 1,
    transitSatelliteLaunchedAt: Date.now() - 60_000,
    transitSatelliteLevel: 1,
    tessClassifications: {},
    ...overrides,
  } as GameState['player']
}

function stateWith(overrides: GameStateOverride = {}): GameState {
  const base: GameState = {
    screen: 'hub',
    player: basePlayer(),
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  } as GameState

  return {
    ...base,
    ...overrides,
    player: {
      ...base.player,
      ...(overrides.player ?? {}),
    },
  } as GameState
}

function visitGame(path: string, overrides: GameStateOverride = {}) {
  const state = stateWith(overrides)
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
      win.localStorage.setItem('ln_missionboard_freeops_explainer_ack', '1')
      win.localStorage.setItem('ln_mining_freeops_first_entry_ack', '1')
      win.localStorage.setItem('ln_mining_freeops_first_success_ack', '1')
    },
  })
}

function savedState() {
  return cy.window().then(win => JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as GameState)
}

function interceptTessSubjects(count = 4) {
  cy.intercept('GET', '**/api/collections/subjects/records*', {
    statusCode: 200,
    body: {
      page: 1,
      perPage: 500,
      totalItems: count,
      totalPages: 1,
      items: Array.from({ length: count }, (_, index) => ({
        id: `review-subject-${index + 1}`,
        subject_type: 'transit',
        gold_label: '',
        consensus: '',
        toi_id: `${3000 + index}.01`,
        tic_id: `${12345000 + index}`,
        period_days: 2.8 + index,
        depth_ppm: 900 + index * 120,
        distance_ly: 80 + index * 25,
        constellation: index % 2 === 0 ? 'Lyra' : 'Cygnus',
        signal_to_noise: 12 + index,
        planet_radius_earth: 1.1 + index / 10,
      })),
    },
  }).as('subjects')
}

describe('Active mission guard (STS-487)', () => {
  it('does not let a stale mission-board tab pick a second mission while one is active', () => {
    visitGame('/game/missions', {
      screen: 'missions',
      missionId: null,
      targetId: null,
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Eros' },
        missionsDone: 3,
        freeOperations: true,
      },
    })

    cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
    cy.get('button[data-testid^="mission-card-"]').first().click({ force: true })

    savedState().then(state => {
      expect(state.screen).to.eq('missions')
      expect(state.missionId).to.eq(null)
      expect(state.targetId).to.eq(null)
      expect(state.player.activeMission?.id).to.eq('generated-s1-starter-bulk-1')
    })
  })
})

describe('Mining pause/resume (STS-488)', () => {
  it('persists in-progress laser cargo on Back and restores it on resume', () => {
    visitGame('/game/mining', {
      screen: 'mining',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Eros' },
        missionsDone: 0,
        freeOperations: false,
        miningCargoInProgress: { platinum: 2 },
      },
    })

    cy.contains('Mining Run', { timeout: 10000 }).should('be.visible')
    cy.contains('2/').should('be.visible')
    cy.get('[data-testid="top-bar-back"]').click()

    savedState().then(paused => {
      expect(paused.screen).to.eq('hub')
      expect(paused.player.miningCargoInProgress).to.deep.eq({ platinum: 2 })

      paused.screen = 'mining'
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(paused))
    })

    cy.visit('/game/mining')
    cy.contains('Mining Run', { timeout: 10000 }).should('be.visible')
    cy.contains('2/').should('be.visible')
  })
})

describe('Rover pause/resume (STS-490)', () => {
  it('keeps the rover extraction clock close to completion after Back-to-hub resume', () => {
    const startedAt = Date.now() - 119_000

    visitGame('/game/rover-mining', {
      screen: 'rover-mining',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Rover landing -> Eros' },
        roverMiningStartedAt: startedAt,
        roverTerrainClassifications: { eros: 'vein' },
      },
    })

    cy.contains('Rover Mining', { timeout: 10000 }).should('be.visible')
    cy.contains(/00:0[0-9]/, { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="top-bar-back"]').click()

    savedState().then(paused => {
      expect(paused.screen).to.eq('hub')
      expect(paused.player.roverMiningStartedAt).to.eq(startedAt)

      paused.screen = 'rover-mining'
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(paused))
    })

    cy.visit('/game/rover-mining')
    cy.contains('EXTRACTION COMPLETE', { timeout: 10000 }).should('be.visible')
    cy.contains('COLLECT CARGO').should('be.visible')
  })
})

describe('Sprint 13 rover scouting (KES-110)', () => {
  it('turns a terrain classification into persisted mineral intelligence before extraction', () => {
    visitGame('/game/rover-mining', {
      screen: 'rover-mining',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Rover landing -> Eros' },
        roverMiningStartedAt: undefined,
        roverTerrainClassifications: {},
      },
    })

    cy.get('[data-testid="rover-scouting-classification"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="rover-classify-vein"]').click()
    cy.contains('MINERAL VEIN').should('be.visible')
    cy.contains('SIGNATURE +3').should('be.visible')

    savedState().then(state => {
      expect(state.player.roverTerrainClassifications?.eros).to.eq('vein')
      expect(state.player.roverMiningStartedAt).to.be.a('number')
    })
  })
})

describe('Satellite/TESS level plumbing (STS-493)', () => {
  it('lets a level-3 satellite review three daily TESS candidates before the downlink is exhausted', () => {
    interceptTessSubjects(4)
    visitGame('/game/galaxy', {
      screen: 'galaxy',
      player: {
        satelliteMonitoringBuilt: true,
        satelliteMonitoringLevel: 1,
        transitSatelliteLaunchedAt: Date.now() - 60_000,
        transitSatelliteLevel: 3,
        tessClassifications: {},
      },
    })

    cy.wait('@subjects')

    // The screen deliberately keeps a just-classified candidate mounted to
    // show the post-confirmation target-selection map rather than refetching
    // in place (see the comment on TessDiscoveryScreen's fetch effect) — the
    // next still-unclassified daily candidate only resolves on remount, so
    // each loop iteration revisits the route instead of reusing one mount.
    for (let index = 1; index <= 3; index += 1) {
      if (index > 1) {
        cy.visit('/game/galaxy')
        cy.wait('@subjects')
      }
      cy.get('[data-testid="tess-discovery-screen"]', { timeout: 15000 }).should('be.visible')
      cy.contains('REVIEW', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid="tess-verdict-unsure"]', { timeout: 10000 }).should('be.visible').click()
      savedState().then(state => {
        expect(Object.keys(state.player.tessClassifications ?? {})).to.have.length(index)
      })
    }

    cy.visit('/game/galaxy')
    cy.wait('@subjects')
    cy.contains('No Reviewable Anomaly', { timeout: 15000 }).should('be.visible')
  })

  it('increments the transit satellite level when the telescope launch mission is collected', () => {
    visitGame('/game/debrief', {
      screen: 'debrief',
      missionId: 'story-transit-telescope-launch',
      targetId: 'earth-orbit-transit-telescope',
      lastCargo: {},
      player: {
        transitSatelliteLaunchedAt: Date.now() - 60_000,
        transitSatelliteLevel: 1,
        activeMission: { id: 'story-transit-telescope-launch', label: 'Launch Transit Telescope -> Earth Orbit' },
      },
    })

    cy.contains('MISSION COMPLETE', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.get('[data-testid="collect-reward-btn"]').click()

    savedState().then(state => {
      expect(state.player.transitSatelliteLevel).to.eq(2)
      expect(state.player.transitSatelliteLaunchedAt).to.be.a('number')
    })
  })
})
