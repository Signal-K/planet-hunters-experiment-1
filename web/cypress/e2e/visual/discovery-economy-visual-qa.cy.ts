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
import { tessCandidateToExoplanetTarget, toTessCandidate } from '../../../lib/data'

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
    satelliteMonitoringBuilt: true,
    transitSatelliteLaunchedAt: Date.now() - 1000,
    tessClassifications: {},
    discoveredExoplanetTargets: {},
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
      // Remove any real PocketBase auth token left by an earlier test — if
      // present, the SDK restores a valid session and the "brand-new user"
      // auth-gate check never even runs (see useAuthSync.ts's authGateOpen
      // effect), which would make this a false negative for other specs
      // rather than a false positive for us. Matches visual-qa.cy.ts's
      // loadPreset, which established this pattern first.
      win.localStorage.removeItem('pocketbase_auth')
      // Fake guest credentials make hasStoredCredentials() true, which is
      // what actually suppresses the auth gate on mount (see useAuthSync.ts)
      // — ensureGuestAuth() then fails to re-auth with these non-existent
      // credentials and falls back to offline mode, same as
      // visual-qa.cy.ts's suppressSurveysAndUpgrade.
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
      // ObservatoryCoach is a separate one-time beat from the main M1-M3
      // tutorial (gated by its own localStorage key, not GameState.tutorial)
      // — mark it seen so it doesn't render its banner/spacer over the
      // chart during the drag-mark gesture below.
      win.localStorage.setItem('landnam_observatory_coach_seen_v1', '1')
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
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

describe('Visual QA — discovery -> economy pipeline', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('_cancelResize')) return false
    return true
  })

  it('confirming a hot, close-in transit assigns a real archetype and non-empty minerals', () => {
    cy.viewport(1280, 800)

    cy.intercept('GET', '**/api/collections/subjects/records*', {
      statusCode: 200,
      body: { page: 1, perPage: 500, totalItems: 1, totalPages: 1, items: [HOT_CLOSE_SUBJECT] },
    }).as('subjects')

    visitWithState('/game', 'galaxy', {})
    cy.wait('@subjects')

    // The injected fake guest credentials only satisfy hasStoredCredentials()
    // — the app still fires ensureGuestAuth() in the background, which fails
    // against the real local PocketBase (no such account), deletes the fake
    // credentials, and races to create a real one. Until that resolves, the
    // "Welcome Back" auth gate can render on top of everything below. A fixed
    // cy.wait() guesses at that race; asserting the gate is gone (with
    // Cypress's built-in retry) actually waits for it.
    cy.contains('Welcome Back', { timeout: 15000 }).should('not.exist')

    cy.contains('TESS ANOMALY', { timeout: 15000 }).should('be.visible')
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
      const saved = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}')
      const discovered = Object.values(saved.player.discoveredExoplanetTargets ?? {}) as Array<{ archetype?: string; minerals: string[] }>
      expect(discovered, 'exactly one confirmed discovery').to.have.length(1)
      const [target] = discovered
      expect(target.archetype, 'hot host + close-in period -> M archetype').to.eq('M')
      expect(target.minerals.length, 'minerals populated, not the old empty []').to.be.greaterThan(0)
    })
  })

  it('a discovered target is reachable through the ordinary mission board and target picker, not just its survey flight', () => {
    cy.viewport(1280, 800)

    // Build the discovered target through the real production function
    // (not hand-authored) so the fixture can never drift from what the app
    // actually produces.
    const candidate = toTessCandidate(HOT_CLOSE_SUBJECT)
    const discovered = tessCandidateToExoplanetTarget(candidate, 2)
    expect(discovered.archetype).to.eq('M')
    expect(discovered.minerals.length).to.be.greaterThan(0)

    visitWithState('/game', 'missions', {
      discoveredExoplanetTargets: { [discovered.id]: discovered },
      freeOperations: true,
    })

    // See the matching comment in the first test — waits out the
    // ensureGuestAuth() race instead of guessing at a fixed delay.
    cy.contains('Welcome Back', { timeout: 15000 }).should('not.exist')

    cy.contains('Mission Board', { timeout: 15000 }).should('be.visible')
    cy.get(`[data-testid="mission-card-exo-survey-${discovered.id}"]`, { timeout: 10000 })
      .should('exist')
      .scrollIntoView()
      .should('be.visible')
    cy.screenshot('discovery-04-mission-board-survey-flight')

    // The exo-survey mission card above is fixed to this one target
    // (game-context.tsx sets targetId directly when generating it), so
    // picking it intentionally skips the target picker and jumps straight to
    // rocket-buy with the target pre-selected — proving that flow doesn't
    // prove the target is reachable any *other* way. Self-Directed Mining
    // has no fixed targetId, so it's the ordinary mission -> target-picker
    // path this test is actually meant to exercise; it requires nickel +
    // cobalt and orbit <= 8, which every 'M'-archetype discovery satisfies
    // (see mineralsForArchetype / tessCandidateToExoplanetTarget).
    cy.get('[data-testid="self-directed-mining-btn"]').scrollIntoView().click({ force: true })
    cy.contains('Pick Target', { timeout: 10000 }).should('be.visible')

    cy.get(`[data-testid="target-${discovered.id}"]`).click({ force: true })
    cy.contains(discovered.name).should('be.visible')
    cy.screenshot('discovery-05-target-picker-real-minerals')

    // "Available here" must list real minerals, not an empty deposit.
    for (const mineral of discovered.minerals.slice(0, 3)) {
      cy.contains(new RegExp(mineral, 'i')).should('exist')
    }
  })
})
