// Dedicated visual QA for the discovery -> economy pipeline
// (discovery-economy-pipeline-implementation-2026-07-17): a confirmed TESS
// classification now assigns a real composition archetype + minerals
// (archetypeForDiscovery, tessCandidateToExoplanetTarget in
// lib/data/tess-candidates.ts) instead of shipping an empty deposit, and the
// resulting target is reachable through the ordinary mission/target-picker
// flow, not just its own one-off survey flight.
//
// Run:
//   CYPRESS_PROFILE=visual npx cypress run --browser chrome --headed --spec "cypress/e2e/visual/discovery-economy-visual-qa.cy.ts"
//   CYPRESS_PROFILE=visual npx cypress open --browser chrome

import type { GameState } from '@/game-context'
// Relative path, not the `@/` alias: Cypress's bundled webpack preprocessor
// has no tsconfig-paths plugin configured (unlike Next.js's own bundler), so
// it can't resolve `@/...` imports. No other spec hits this because none of
// them import real (non-type) values from app source — `@/` only appears in
// `import type` here, which is erased before bundling and never resolved.
// Imported from the submodule, not the `@/lib/data` barrel, to avoid pulling
// in lib/data/structures.ts's own `@/lib/featureFlags` import transitively.
import { tessCandidateToExoplanetTarget, toTessCandidate } from '../../../lib/data/tess-candidates'

const STORAGE_KEY = 'landnam-game-state-v1'
const AUTHENTICATED_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-discovery-user`

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
    transitSatelliteLaunchedAt: Date.now() - 1000,
    tessClassifications: {},
    discoveredExoplanetTargets: {},
    ...overrides,
  } as GameState['player']
}

function visitWithState(path: string, screen: GameState['screen'], playerOverrides: Partial<GameState['player']>) {
  const tokenPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  const e2eToken = `e30.${tokenPayload}.test`
  cy.intercept('POST', '**/api/collections/users/auth-refresh', {
    statusCode: 200,
    body: { token: e2eToken, record: { id: 'e2e-discovery-user', email: 'e2e@example.com' } },
  })
  cy.intercept('POST', '**/api/landnam-auth/exchange', {
    statusCode: 200,
    body: { token: e2eToken, record: { id: 'e2e-discovery-user' } },
  })

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
      // Seed a valid synthetic shared session so the real subject request is
      // made. Without it, fetchReviewableTessCandidates() intentionally
      // returns an empty feed before issuing network I/O.
      win.localStorage.setItem('pocketbase_auth', JSON.stringify({
        token: e2eToken,
        record: { id: 'e2e-discovery-user', email: 'e2e@example.com' },
      }))
      // Each visual test gets its own guest account. Reusing one account lets
      // backend state from a preceding discovery test race the seeded local
      // state here and remove the discovered target before Launchpad builds
      // its runtime catalog.
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
        email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        password: 'e2e-guest-test',
      }))
      // ObservatoryCoach is a separate one-time beat from the main M1-M3
      // tutorial (gated by its own localStorage key, not GameState.tutorial)
      // — mark it seen so it doesn't render its banner/spacer over the
      // chart during the drag-mark gesture below.
      win.localStorage.setItem('landnam_observatory_coach_seen_v1', '1')
      const serialized = JSON.stringify(full)
      win.localStorage.setItem(STORAGE_KEY, serialized)
      win.localStorage.setItem(AUTHENTICATED_STORAGE_KEY, serialized)
    },
  })
}

// A hot-host (F/A/B/O, st_teff >= 6000K), close-in (period <= 10 day)
// candidate — archetypeForDiscovery maps this combination to 'M' (metallic),
// mirroring real close-in-hot-star irradiation-stripping reasoning.
const HOT_CLOSE_SUBJECT = {
  id: 'subj-toi-2000',
  subject_type: 'transit',
  gold_label: '',
  consensus: '',
  toi_id: '2000.01',
  tic_id: '98765432',
  period_days: 2.4,
  depth_ppm: 1200,
  distance_ly: 210,
  constellation: 'Draco',
  signal_to_noise: 18,
  planet_radius_earth: 1.2,
  st_teff: 9500,
}

function stubBackgroundSubjectReads() {
  // The exo-survey mission is generated from the discovered target persisted
  // in GameState (see buildRuntimeCatalog), not from the shared subjects feed.
  // CI runs a vanilla shared PocketBase without the subjects collection or
  // /api/ss/subjects/last-confirmed route, so leave these unrelated background
  // reads deterministic instead of letting 401/400 responses obscure the
  // local discovery -> mission path under test.
  cy.intercept('GET', '**/api/ss/subjects/last-confirmed', {
    statusCode: 200,
    body: { lastConfirmedAt: null, subjectId: null },
  }).as('lastConfirmedSubject')
  cy.intercept('GET', '**/api/collections/subjects/records*', {
    statusCode: 200,
    body: { page: 1, perPage: 500, totalItems: 0, totalPages: 1, items: [] },
  }).as('backgroundSubjects')
}

describe('Visual QA — discovery -> economy pipeline', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('_cancelResize')) return false
    return true
  })

  it('confirming a hot, close-in transit assigns a real archetype and non-empty minerals', () => {
    cy.viewport(1280, 800)

    stubBackgroundSubjectReads()

    cy.intercept('GET', '**/api/collections/subjects/records*', {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
      body: { page: 1, perPage: 500, totalItems: 1, totalPages: 1, items: [HOT_CLOSE_SUBJECT] },
    }).as('subjects')

    visitWithState('/game/galaxy', 'galaxy', {})
    cy.wait('@subjects')

    // The injected fake guest credentials only satisfy hasStoredCredentials()
    // — the app still fires ensureAccountAuth() in the background, which fails
    // against the real local PocketBase (no such account), deletes the fake
    // credentials, and races to create a real one. Until that resolves, the
    // "Welcome Back" auth gate can render on top of everything below. A fixed
    // cy.wait() guesses at that race; asserting the gate is gone (with
    // Cypress's built-in retry) actually waits for it.
    cy.contains('Welcome Back', { timeout: 15000 }).should('not.exist')

    cy.contains('INSTRUMENT DATA FEED', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="observatory-chart-canvas"]', { timeout: 15000 }).first().should('be.visible')
    // PixiJS resizes/paints the canvas a tick after it mounts — the chart's
    // internal hit-test bounds aren't ready the instant the element appears
    // (mirrors the 1.5s settle wait the mining-canvas visual tests already
    // use before their first interaction).
    cy.wait(1500)
    cy.screenshot('discovery-01-anomaly-loaded')

    // Confirm Transit is disabled until the player marks at least one region —
    // mirrors the real citizen-science interaction, not a canned verdict.
    cy.get('[data-testid="tess-verdict-planet"]').should('be.disabled')

    cy.get('[data-testid="observatory-chart-canvas"]').first()
      .should(($canvas) => {
        expect(($canvas[0] as HTMLCanvasElement).width, 'canvas has resized/painted').to.be.greaterThan(0)
      })

    // Drag-mark a transit region on the lightcurve canvas (pointerdown ->
    // pointermove -> pointerup), same gesture a real player performs.
    // ObservatoryChart calls canvas.setPointerCapture(e.pointerId) inside its
    // pointerdown handler, which throws on a Cypress-synthesised .trigger()
    // event (no OS-level "active pointer" backs it) — silently short-
    // circuiting the drag with no test-visible error. Dispatching real
    // `PointerEvent`s constructed by the page's own window (same-origin) is
    // recognised as an active pointer and makes setPointerCapture succeed.
    cy.get('[data-testid="observatory-chart-canvas"]').first().then($canvas => {
      const canvas = $canvas[0] as HTMLCanvasElement
      const rect = canvas.getBoundingClientRect()
      const y = rect.top + rect.height / 2
      const x1 = rect.left + rect.width * 0.3
      const xMid = rect.left + rect.width * 0.45
      const x2 = rect.left + rect.width * 0.6
      cy.window().then(win => {
        const PE = win.PointerEvent
        const fire = (type: string, clientX: number) => {
          const ev = new PE(type, {
            pointerId: 1, isPrimary: true, bubbles: true, cancelable: true, clientX, clientY: y, buttons: 1,
          })
          canvas.dispatchEvent(ev)
        }
        const onErr = (e: ErrorEvent) => { (win as unknown as { __dragError?: string }).__dragError = e.message }
        win.addEventListener('error', onErr)
        fire('pointerdown', x1)
        fire('pointermove', xMid)
        fire('pointermove', x2)
        fire('pointerup', x2)
        win.removeEventListener('error', onErr)
      })
    })
    cy.wait(300)
    cy.window().its('__dragError' as never).should('eq', undefined)
    cy.screenshot('discovery-02-transit-region-marked')

    cy.get('[data-testid="tess-verdict-planet"]').should('not.be.disabled').click()
    cy.wait(300)

    // Confirming swaps the chart viewport to the satellite-pointing star map.
    cy.contains('TARGET SELECT', { timeout: 10000 }).should('be.visible')
    cy.screenshot('discovery-03-confirmed-star-map')

    cy.window().then(win => {
      const saved = JSON.parse(win.localStorage.getItem(AUTHENTICATED_STORAGE_KEY) || win.localStorage.getItem(STORAGE_KEY) || '{}')
      const discovered = Object.values(saved.player.discoveredExoplanetTargets ?? {}) as Array<{ archetype?: string; minerals: string[] }>
      expect(discovered, 'exactly one confirmed discovery').to.have.length(1)
      const [target] = discovered
      expect(target.archetype, 'hot host + close-in period -> M archetype').to.eq('M')
      expect(target.minerals.length, 'minerals populated, not the old empty []').to.be.greaterThan(0)
    })
  })

  it('a discovered target is reachable through Your Program and the target picker', () => {
    cy.viewport(1280, 800)
    stubBackgroundSubjectReads()

    // Build the discovered target through the real production function
    // (not hand-authored) so the fixture can never drift from what the app
    // actually produces.
    const candidate = toTessCandidate(HOT_CLOSE_SUBJECT)
    const discovered = tessCandidateToExoplanetTarget(candidate, 2)
    expect(discovered.archetype).to.eq('M')
    expect(discovered.minerals.length).to.be.greaterThan(0)

    visitWithState('/game/launchpad', 'launchpad', {
      discoveredExoplanetTargets: { [discovered.id]: discovered },
      freeOperations: true,
    })

    // See the matching comment in the first test — waits out the
    // ensureAccountAuth() race instead of guessing at a fixed delay.
    cy.contains('Welcome Back', { timeout: 15000 }).should('not.exist')

    cy.contains('Your Program', { timeout: 15000 }).should('be.visible')
    // KES-329/330 replaced the single aggregate OPS button with the
    // launchpad mission menu's explicit operation choices. The discovered
    // target is a mining destination (real mineral deposit, not an
    // instrument/build payload), so the stable proof here is the real
    // Launchpad -> "GO MINING" -> sell -> target-picker route.
    cy.get('[data-testid="launchpad-new-mission-btn"]', { timeout: 10000 }).click()
    cy.get('[data-testid="launchpad-new-mission-mining-btn"]', { timeout: 10000 })
      .should('not.be.disabled')
      .click()
    cy.get('[data-testid="launchpad-mining-sell-btn"]', { timeout: 10000 }).click()
    cy.screenshot('discovery-04-own-program-survey-flight')

    // The aggregate action selects the first available own-program mission;
    // this ordinary mission -> target-picker path is what proves the newly
    // discovered target is usable outside the fixed-target survey flight.
    cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')

    cy.get(`[data-testid="target-${discovered.id}"]`).click({ force: true })
    cy.contains(discovered.name).should('be.visible')
    cy.screenshot('discovery-05-target-picker-real-minerals')

    // The card intentionally caps and rarity-sorts its chips, so assert that
    // the visible mix is non-empty and drawn from the target's real deposit
    // rather than assuming the first three source minerals survive the cap.
    cy.get('[data-testid="target-deposit-mix"]').should('be.visible').children().should('have.length.greaterThan', 0)
    cy.get('[data-testid^="target-deposit-"]').then($chips => {
      const visibleMinerals = [...$chips]
        .map(chip => chip.getAttribute('data-testid')?.replace('target-deposit-', ''))
        .filter((mineral): mineral is string => Boolean(mineral && mineral !== 'mix'))
      expect(visibleMinerals, 'visible deposit chips').to.have.length.greaterThan(0)
      expect(visibleMinerals.every(mineral => discovered.minerals.includes(mineral))).to.eq(true)
    })
  })
})
