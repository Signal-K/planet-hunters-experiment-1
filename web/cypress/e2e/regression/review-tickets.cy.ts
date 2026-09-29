import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'
const AUTHENTICATED_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-user`

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
      win.localStorage.setItem(AUTHENTICATED_STORAGE_KEY, JSON.stringify(state))
      seedFixtureSession(win, 'e2e-user')
      win.localStorage.setItem('ln_missionboard_freeops_explainer_ack', '1')
      win.localStorage.setItem('ln_mining_freeops_first_entry_ack', '1')
      win.localStorage.setItem('ln_mining_freeops_first_success_ack', '1')
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

function savedState() {
  return cy.window().then(win => JSON.parse(win.localStorage.getItem(STORAGE_KEY) || win.localStorage.getItem(AUTHENTICATED_STORAGE_KEY) || '{}') as GameState)
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

describe('Parallel mission runs (replaces the STS-487 single-mission guard)', () => {
  // STS-487 made picking a second mission a no-op while one was active. Runs
  // are now independently resumable (useGameLoop onPickMission): accepting
  // another contract parks the current run instead of discarding it.
  it('parks the active run when another contract is accepted', () => {
    visitGame('/game/hub', {
      screen: 'hub',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Platinum starter order -> Eros' },
        missionPhase: 'transit',
        missionRunId: 'run-active-1',
        transitStartedAt: Date.now() - 60_000,
        arrivalAt: Date.now() + 60 * 60_000,
        missionsDone: 3,
        freeOperations: true,
      },
    })

    cy.get('[data-testid="bottom-tab-missions"]', { timeout: 10000 }).click()
    cy.get('[data-testid^="mission-accept-"]', { timeout: 10000 }).first().then($accept => {
      const acceptedId = $accept.attr('data-testid')!.replace('mission-accept-', '')
      cy.wrap($accept).click()
      cy.get('[data-testid="mission-target-map"]', { timeout: 10000 }).should('be.visible')
      savedState().should(state => {
        expect(state.missionId).to.eq(acceptedId)
        expect(state.player.activeMission ?? null).to.eq(null)
        expect(state.player.pausedMissionRuns?.map(run => run.key)).to.deep.eq(['run-active-1'])
        expect(state.player.pausedMissionRuns?.[0].missionId).to.eq('generated-s1-starter-bulk-1')
      })
    })
  })
})

describe('Surface Silo placement persistence (KES-271)', () => {
  it('persists the placed silo and plot after returning to the base and reloading', () => {
    visitGame('/game/hub', {
      screen: 'hub',
      player: {
        francs: 15_000_000_000,
        placed: ['launchpad'],
        placementPlots: { launchpad: 0 },
        missionsDone: 4,
        freeOperations: true,
      },
    })

    cy.contains('h1', 'Base', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="hub-edit-build-btn"]').click()
    cy.get('[data-testid="hub-new-structure-btn"]').click()
    cy.get('[data-testid="build-place-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('button', 'Surface Silo', { timeout: 10000 })
      .should('be.visible')
      .click()
    cy.get('[data-testid="build-plot-1"]', { timeout: 10000 }).click()
    cy.contains('button', 'Confirm · Build Here', { timeout: 10000 }).click()
    cy.get('[data-testid="building-surface-silo-hit"]', { timeout: 10000 }).should('be.visible')

    savedState().then(state => {
      expect(state.player.placed).to.include('surface-silo')
      expect(state.player.placementPlots?.['surface-silo']).to.eq(1)
      expect(state.player.underConstruction?.['surface-silo']).to.be.a('number')
    })

    cy.get('[data-structure="surface-silo"] img.earth-base-flat-sprite')
      .should('have.attr', 'src', '/game/assets/base/surface_silo_flat.png')
    cy.contains('BUILDING').should('be.visible')
    cy.get('.hub-construction-rig').should('exist')

    cy.reload()
    cy.get('[data-testid="building-surface-silo-hit"]', { timeout: 10000 }).should('be.visible')
    savedState().then(state => {
      expect(state.player.placed).to.include('surface-silo')
      expect(state.player.placementPlots?.['surface-silo']).to.eq(1)
    })
    cy.get('[data-structure="surface-silo"] img.earth-base-flat-sprite')
      .should('have.attr', 'src', '/game/assets/base/surface_silo_flat.png')
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
      window.localStorage.setItem(AUTHENTICATED_STORAGE_KEY, JSON.stringify(paused))
    })

    cy.visit('/game/mining')
    cy.contains('Mining Run', { timeout: 10000 }).should('be.visible')
    cy.contains('2/').should('be.visible')
  })
})

describe('Rover pause/resume (KES-205)', () => {
  it('returns to the same live TakeOn field after Back-to-hub resume', () => {
    visitGame('/game/rover-mining', {
      screen: 'rover-mining',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Rover landing -> Eros' },
      },
    })

    cy.get('[data-testid="rover-mining-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="deploy-surface-ops-confirm"]', { timeout: 10000 }).click()
    cy.get('[data-testid="rover-mining-screen"] canvas[aria-label]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="top-bar-back"]').click()

    savedState().then(paused => {
      expect(paused.screen).to.eq('hub')

      paused.screen = 'rover-mining'
      window.localStorage.setItem(AUTHENTICATED_STORAGE_KEY, JSON.stringify(paused))
    })

    cy.visit('/game/rover-mining')
    cy.get('[data-testid="deploy-surface-ops-confirm"]', { timeout: 10000 }).click()
    cy.get('[data-testid="rover-mining-screen"] canvas[aria-label]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="rover-cargo-order"]').should('be.visible')
  })
})

describe('Live rover field migration (KES-205)', () => {
  it('mounts the TakeOn field instead of the retired classification and timer flow', () => {
    visitGame('/game/rover-mining', {
      screen: 'rover-mining',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Rover landing -> Eros' },
      },
    })

    cy.get('[data-testid="deploy-surface-ops-confirm"]', { timeout: 10000 }).click()
    cy.get('[data-testid="rover-mining-screen"] canvas[aria-label="Surface operations on ironrock"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="rover-scouting-classification"]').should('not.exist')
    cy.get('[data-testid="rover-return-to-ship"]').should('be.disabled')
  })
})

describe('Satellite/TESS level plumbing (STS-493)', () => {
  it('lets a level-3 satellite review three daily TESS candidates before the downlink is exhausted', () => {
    interceptTessSubjects(3)
    visitGame('/game/galaxy', {
      screen: 'galaxy',
      player: {
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

    cy.window().then(win => {
      const state = JSON.parse(win.localStorage.getItem(AUTHENTICATED_STORAGE_KEY) || '{}') as GameState
      expect(Object.keys(state.player.tessClassifications ?? {})).to.have.length(3)
    })
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

    // An orbital instrument deployment has no vehicle teardown: the telescope
    // stays in orbit, so the debrief opens already resolved and only logs the
    // program outcome.
    cy.contains('COMMISSIONED', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="resolve-cargo-btn"]').should('not.exist')
    cy.get('[data-testid="collect-reward-btn"]').click()

    savedState().then(state => {
      expect(state.player.transitSatelliteLevel).to.eq(2)
      expect(state.player.transitSatelliteLaunchedAt).to.be.a('number')
    })
  })
})
