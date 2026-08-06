// KES-113: mission-type coverage matrix. The Deep Space Telescope /
// asteroid-discovery instrument (STS-622) is a fully built, live mission
// type — buildable structure, its own gated screen, real classification
// submit — with zero prior Cypress coverage anywhere in this repo. This spec
// closes that gap and, per KES-113's brief, runs it across the same
// viewport classes c1-c4-viewport-matrix.cy.ts uses for screen contracts, so
// a regression on tablet/desktop/landscape doesn't hide behind mobile-only
// coverage.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

const VIEWPORTS = [
  { label: 'mobile portrait', width: 390, height: 844 },
  { label: 'mobile landscape', width: 844, height: 390 },
  { label: 'tablet portrait', width: 768, height: 1024 },
  { label: 'desktop', width: 1280, height: 800 },
] as const

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
    satelliteMonitoringBuilt: true,
    transitSatelliteLaunchedAt: Date.now() - 60_000,
    tessClassifications: {},
    deepSpaceTelescopeBuilt: false,
    asteroidClassifications: {},
    ...overrides,
  } as GameState['player']
}

function visit(path: string, screen: GameState['screen'], playerOverrides: Partial<GameState['player']> = {}) {
  const state: GameState = {
    screen,
    player: basePlayer(playerOverrides),
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  } as GameState

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
    },
  })
}

const MOCK_CANDIDATE = {
  id: 'neocp-2026-a1',
  temp_desig: 'P21ab3C',
  score: 87,
  discovery_date: '2026-08-01',
  ra: 12.3456,
  decl: -4.5678,
  v_mag: 19.2,
  h_mag: 22.1,
  n_obs: 6,
  arc_days: 0.42,
  last_seen_days: 0.8,
  resolved: false,
}

function interceptCandidates() {
  cy.intercept('GET', '**/api/collections/asteroid_candidates/records*', {
    statusCode: 200,
    body: { page: 1, perPage: 500, totalItems: 1, totalPages: 1, items: [MOCK_CANDIDATE] },
  }).as('asteroidCandidates')
}

describe('Deep Space Telescope / asteroid-discovery mission type across viewport classes', () => {
  for (const viewport of VIEWPORTS) {
    describe(viewport.label, () => {
      beforeEach(() => cy.viewport(viewport.width, viewport.height))

      it('gates the instrument behind Free Operations', () => {
        visit('/game/asteroid-discovery', 'asteroid-discovery', { freeOperations: false })
        cy.contains('Free Operations Required', { timeout: 10000 }).should('be.visible')
      })

      it('gates the instrument behind building the telescope once Free Ops is unlocked', () => {
        visit('/game/asteroid-discovery', 'asteroid-discovery', { freeOperations: true, deepSpaceTelescopeBuilt: false })
        cy.contains('Build Deep Space Telescope', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="build-deep-space-telescope-btn"]').should('be.visible')
      })

      it('downlinks a live NEOCP candidate and lets the player cast a verdict once the telescope is built', () => {
        interceptCandidates()
        visit('/game/asteroid-discovery', 'asteroid-discovery', { freeOperations: true, deepSpaceTelescopeBuilt: true })
        // Not `cy.wait('@asteroidCandidates')`: Next dev's React StrictMode
        // double-invokes the fetch effect, and the screen's own `cancelled`
        // guard discards whichever of the two requests resolves first — that
        // discarded one is what a single cy.wait would catch, before the
        // real (second) fetch has updated the DOM. Assert on the rendered
        // result directly and let Cypress's retry-until-timeout handle it.
        cy.get('[data-testid="asteroid-discovery-screen"]', { timeout: 15000 }).should('be.visible')
        cy.contains('INSTRUMENT DATA FEED', { timeout: 15000 }).should('be.visible')
        cy.contains('P21ab3C').should('be.visible')
        cy.get('[data-testid="neocp-verdict-likely_real"]').should('be.visible').click({ force: true })
        // KES-116: submitting immediately re-triggers the candidate-fetch
        // effect (it's keyed on `player.asteroidClassifications`), which
        // re-runs `unresolvedDeepSpaceInstrumentDigest` and — now that this
        // candidate is classified — filters it straight back out. At
        // telescope level 1 (one candidate/day, the default) that leaves no
        // candidate to attach the "ANNOTATION SAVED" pill to, so the screen
        // falls through to the empty state instead of confirming the
        // submission. The classification itself does persist correctly
        // (asserted below) — only the on-screen confirmation is unreachable.
        cy.contains('No Reviewable Candidate', { timeout: 15000 }).should('be.visible')
        cy.window().then(win => {
          const saved = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as GameState
          expect(saved.player.asteroidClassifications?.[MOCK_CANDIDATE.id]?.verdict).to.eq('likely_real')
        })
      })
    })
  }
})
