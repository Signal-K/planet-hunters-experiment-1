/**
 * Bug-hunt: edge cases and break scenarios from manual-play simulation.
 * Each test targets a realistic failure mode that basic smoke tests miss.
 */

import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'
// A signed-in player's save lives in the account slot (seedFixtureSession's user).
const ACCOUNT_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-fixture-user`
const CONTRACT_STEP = '[data-testid="mission-setup-scaffold"][data-step="1"]'
const HUB_TITLE = /^(Base|Earth Base)$/

/** A signed-in reload always lands on Earth Base (initial-route.ts); open
 *  the contract board from there the way a player does. */
function openContracts() {
  cy.contains('h1', HUB_TITLE, { timeout: 8000 }).should('be.visible')
  cy.get('[data-testid="bottom-tab-missions"]').click()
  cy.get(CONTRACT_STEP, { timeout: 8000 }).should('be.visible')
}

/** Authorise the teardown and skip its Pixi scrap sequence (KES-348). */
function teardownVehicle() {
  cy.get('[data-testid="resolve-cargo-btn"]').click()
  cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).click()
}
const SURVEY_KEY = 'landnam-surveys-shown'

const ALL_SURVEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext',
        'lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext',
]

const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
const FAR_FUTURE = String(Date.now() + 365 * 24 * 60 * 60 * 1000)

function baseLoad(extra: Record<string, string> = {}) {
  return (win: Window) => {
    win.localStorage.clear()
    win.localStorage.setItem(SNOOZE_KEY, FAR_FUTURE)
    win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEYS))
    for (const [k, v] of Object.entries(extra)) win.localStorage.setItem(k, v)
    seedFixtureSession(win)
  }
}

type GameStateOverride = Omit<Partial<GameState>, 'player'> & {
  player?: Partial<GameState['player']>
}

function stateWith(overrides: GameStateOverride): string {
  const base: Partial<GameState> = {
    screen: 'hub',
    tutorial: false,
    doneSteps: {},
    missionId: null,
    targetId: null,
    popup: null,
    menuOpen: false,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    player: {
      francs: 10_000_000_000,
      activeMission: null,
      missionCount: 1,
      pendingLaunch: false,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      controlBuilt: false,
      missionsDone: 0,
      skillPoints: 0,
      unlockedSkillNodes: [],
      freeOperations: false,
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
    },
  }
  return JSON.stringify({ ...base, ...overrides, player: { ...(base.player as object), ...((overrides.player ?? {}) as object) } })
}

describe('Bug hunt — edge cases', () => {
  beforeEach(() => cy.viewport(390, 844))

  // ─── 1. Zero-cargo mining: player fires laser but ore is empty ────────────────
  it('debrief handles zero cargo gracefully (no ore collected)', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'debrief',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'eros',
        lastCargo: {},
        tutorial: false,
      }) }),
    })
    cy.contains('RETURNED FROM', { timeout: 8000 }).should('be.visible')
    cy.contains('Order incomplete').should('be.visible')
    // Every debrief asks for an explicit teardown first (KES-348).
    teardownVehicle()
    // Nothing is paid for an incomplete order, but the player can still leave.
    cy.get('[data-testid="collect-reward-btn"]').should('be.visible').click()
    cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 8000 }).should('be.visible')
  })

  // ─── 2. Loan system: player in debt clears it from debrief payout ────────────
  it('loan debt is repaid from next debrief payout without crashing', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'debrief',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'eros',
        lastCargo: { platinum: 5 },
        tutorial: false,
        player: {
          francs: 0,
          loanDebt: 5_400_000_000,
          loanOffered: true,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          missionsDone: 0,
        },
      }) }),
    })
    teardownVehicle()
    cy.get('[data-testid="collect-reward-btn"]').click()
    cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 8000 }).should('be.visible')
    // Should not crash and state should not have negative francs
    cy.window().then(win => {
      const state = JSON.parse(win.localStorage.getItem(ACCOUNT_STORAGE_KEY) || '{}') as GameState
      expect(state.player.francs).to.be.at.least(0)
    })
  })

  // ─── 3. Tutorial skip mid-flow: skip on step 4 (fab screen) ─────────────────
  it('tutorial coach mid-flow does not block play controls', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'fab',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'eros',
        tutorial: true,
        doneSteps: { 1: true, 2: true, 3: true },
      }) }),
    })
    cy.get('[data-testid="tutorial-coach-overlay"]', { timeout: 8000 }).should('be.visible')
    cy.get('[data-testid="launch-btn"]').should('be.visible').and('not.be.disabled')
  })

  // ─── 4. Back navigation from targets → missions without state corruption ──────
  it('navigating back from target picker does not corrupt mission state', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'hub',
        tutorial: false,
      }) }),
    })
    openContracts()
    cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').click()
    cy.get('[data-testid="mission-target-map"]', { timeout: 8000 }).should('be.visible')
    cy.get('[data-testid="mission-setup-scaffold"] button[aria-label="Back"]').click()
    cy.get(CONTRACT_STEP, { timeout: 8000 }).should('be.visible')
    // Mission should still be selectable after back navigation
    cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').should('be.visible').and('not.be.disabled')
  })

  // ─── 5. State repair: loading with targets screen but no missionId ────────────
  it('repairStateRoute recovers from orphaned targets screen', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: JSON.stringify({
        screen: 'targets',
        missionId: null,
        targetId: null,
        tutorial: false,
        player: { placed: ['launchpad'], missionsDone: 0, francs: 10_000_000_000 },
      }) }),
    })
    // With no mission context the reload repairs to Earth Base, not a
    // broken target step.
    cy.contains('h1', HUB_TITLE, { timeout: 8000 }).should('be.visible')
    cy.get('[data-testid="mission-target-map"]').should('not.exist')
  })

  // ─── 6. Retired client cooldowns: a stored cooldown no longer hides work ──
  // The Free Ops board is the catalog of client work; per-client cooldown
  // gates were removed on purpose (useMissionRelayModels). An old save that
  // still carries a cooldown must not hide that client's contracts.
  it('a stored client cooldown from an old save does not hide that client', () => {
    const thirtyMinutesFromNow = Date.now() + 30 * 60 * 1000
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'missions',
        tutorial: false,
        player: {
          missionsDone: 3,
          freeOperations: true,
          clientMissions: { 'helios-propulsion-depot': 4 },
          clientStreaks: { 'helios-propulsion-depot': 0 },
          clientCooldowns: { 'helios-propulsion-depot': thirtyMinutesFromNow },
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          francs: 10_000_000_000,
        },
      }) }),
    })
    openContracts()
    cy.get('[data-testid="mission-board-section-client"]').should('contain', 'Helios Propulsion Depot')
    cy.get('[data-testid^="mission-accept-"]').should('not.be.disabled')
  })

  // ─── 7. Transit → back does not softlock the player ──────────────────────────
  it('back from transit returns to mission board (no softlock)', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'transit',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'eros',
        tutorial: false,
        player: {
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          missionsDone: 0,
          francs: 10_000_000_000,
        },
      }) }),
    })
    cy.contains('MISSION TRANSIT', { timeout: 8000 }).should('be.visible')
    cy.get('[data-testid="top-bar-back"]').click()
    // Back from transit goes to hub (player can re-enter missions from there — no softlock)
    cy.get('[data-testid="bottom-tab-missions"]', { timeout: 8000 }).should('be.visible')
  })

  // ─── 8. Duplicate mission pick (tap twice quickly) ───────────────────────────
  it('picking the same mission twice quickly does not navigate to wrong screen', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'missions',
        tutorial: false,
        doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true },
        player: { placed: ['launchpad'], missionsDone: 0, francs: 10_000_000_000 },
      }) }),
    })
    openContracts()
    // Double-click the same contract
    cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').dblclick({ force: true })
    // Should still navigate correctly (not crash or go to wrong screen)
    cy.get('[data-testid="mission-target-map"]', { timeout: 8000 }).should('be.visible')
  })

  // ─── 9. Screen guard: mining screen without mission context redirects ─────────
  it('loading mining screen without mission context repairs to missions', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: JSON.stringify({
        screen: 'mining',
        missionId: null,
        targetId: null,
        tutorial: false,
        player: { placed: ['launchpad'], missionsDone: 0, francs: 10_000_000_000 },
      }) }),
    })
    // With no mission context the reload repairs to Earth Base, not a
    // mining screen with nothing to mine.
    cy.contains('h1', HUB_TITLE, { timeout: 8000 }).should('be.visible')
    cy.get('[data-testid="mining-canvas"]').should('not.exist')
  })

  // ─── 10. Refinery: attempt to queue without having built the refinery ─────────
  it('refinery screen renders without crashing even when not built', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'refinery',
        tutorial: false,
        player: {
          missionsDone: 3,
          freeOperations: true,
          refineryBuilt: false,
          refineryUnlocked: true,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          francs: 10_000_000_000,
        },
      }) }),
    })
    // Should render something without crashing
    cy.get('body').should('exist')
    cy.get('[data-testid="error-boundary-fallback"]').should('not.exist')
  })

  // ─── 11. Legacy save predating placementPlots: launchpad renders at the
  // real onboarding slot (plot 0), not the old hardcoded fallback (plot 1) ──
  const legacySaveState = stateWith({
    screen: 'hub',
    tutorial: false,
    player: {
      placed: ['launchpad'],
      placementPlots: {}, // simulates a save from before this field existed
      missionsDone: 1,
      francs: 10_000_000_000,
    },
  })

  it('legacy pre-placementPlots save renders launchpad at plot 0 (mobile)', () => {
    cy.visit('/game', { onBeforeLoad: baseLoad({ [STORAGE_KEY]: legacySaveState }) })
    cy.get('[data-testid="building-launchpad"]', { timeout: 8000 })
      .should('have.attr', 'style')
      .and('match', /left:\s*clamp\(\d+px,\s*14\.925[34]%/)
  })

  it('legacy pre-placementPlots save renders launchpad at plot 0 (desktop)', () => {
    cy.viewport(1440, 900)
    cy.visit('/game', { onBeforeLoad: baseLoad({ [STORAGE_KEY]: legacySaveState }) })
    cy.get('[data-testid="building-launchpad"]', { timeout: 8000 })
      .should('have.attr', 'style')
      .and('match', /left:\s*clamp\(\d+px,\s*14\.925[34]%/)
  })
})
