/**
 * Bug-hunt: edge cases and break scenarios from manual-play simulation.
 * Each test targets a realistic failure mode that basic smoke tests miss.
 */

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const GUEST_KEY = 'landnam-guest-credentials'
const SURVEY_KEY = 'landnam-surveys-shown'

const ALL_SURVEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_contractor_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
]

const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
const FAR_FUTURE = String(Date.now() + 365 * 24 * 60 * 60 * 1000)
const GUEST = JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' })

function baseLoad(extra: Record<string, string> = {}) {
  return (win: Window) => {
    win.localStorage.clear()
    win.localStorage.setItem(GUEST_KEY, GUEST)
    win.localStorage.setItem(SNOOZE_KEY, FAR_FUTURE)
    win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEYS))
    for (const [k, v] of Object.entries(extra)) win.localStorage.setItem(k, v)
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
    cy.contains('Returned', { timeout: 8000 }).should('be.visible')
    // No cargo to resolve; resolve button should still let player proceed
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    // Payout might be 0 but UI should not crash
    cy.contains('Francs Earned').should('be.visible')
    cy.get('[data-testid="collect-reward-btn"]').should('be.visible').click()
    cy.contains('Earth Base', { timeout: 8000 }).should('be.visible')
  })

  // ─── 2. Loan system: player in debt clears it from debrief payout ────────────
  it('loan debt is repaid from next debrief payout without crashing', () => {
    cy.visit('/game', {
      onBeforeLoad: baseLoad({ [STORAGE_KEY]: stateWith({
        screen: 'debrief',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'eros',
        lastCargo: { iron: 4, silicon: 2 },
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
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.get('[data-testid="collect-reward-btn"]').click()
    cy.contains('Earth Base', { timeout: 8000 }).should('be.visible')
    // Should not crash and state should not have negative francs
    cy.window().then(win => {
      const state = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as GameState
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
        screen: 'targets',
        missionId: 'generated-s1-starter-bulk-1',
        tutorial: false,
      }) }),
    })
    cy.contains('Pick Target', { timeout: 8000 }).should('be.visible')
    cy.get('[data-testid="top-bar-back"]').click()
    cy.contains('Mission Board', { timeout: 8000 }).should('be.visible')
    // Mission should still be selectable after back navigation
    cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').scrollIntoView().should('be.visible')
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
    // Should repair to missions screen since no mission context
    cy.contains('Mission Board', { timeout: 8000 }).should('be.visible')
  })

  // ─── 6. Client streak: 2 missions → cooldown appears, 3rd client available ──
  it('client cooldown shows after 2 missions and other clients remain available', () => {
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
    cy.contains('EARTH BASE · FREE OPS', { timeout: 8000 }).should('be.visible')
    // Helios on cooldown: no Helios mission cards shown in legacy freeops mode (filtered out)
    cy.get('[data-testid^="mission-card-freeops-helios-propulsion-depot"]').should('not.exist')
    // Other clients' missions still show
    cy.contains('Atlas Aggregate', { timeout: 10000 }).scrollIntoView().should('be.visible')
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
    cy.contains('Mission Board', { timeout: 8000 }).should('be.visible')
    // Double-click the same mission card
    cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').dblclick({ force: true })
    // Should still navigate correctly (not crash or go to wrong screen)
    cy.contains('Pick Target', { timeout: 8000 }).should('be.visible')
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
    // repair should redirect to missions
    cy.contains('Mission Board', { timeout: 8000 }).should('be.visible')
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
      .and('match', /left:\s*calc\(14\.925[34]/)
  })

  it('legacy pre-placementPlots save renders launchpad at plot 0 (desktop)', () => {
    cy.viewport(1440, 900)
    cy.visit('/game', { onBeforeLoad: baseLoad({ [STORAGE_KEY]: legacySaveState }) })
    cy.get('[data-testid="building-launchpad"]', { timeout: 8000 })
      .should('have.attr', 'style')
      .and('match', /left:\s*calc\(14\.925[34]/)
  })
})
