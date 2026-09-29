import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'

type StateOverride = Omit<Partial<GameState>, 'player'> & {
  player?: Partial<GameState['player']>
}

function fullState(overrides: StateOverride = {}): GameState {
  const player: GameState['player'] = {
    francs: 10_000_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 1 },
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
    ...overrides.player,
  }

  return {
    screen: 'hub',
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    ...overrides,
    player,
  }
}

// A signed-in player's save lives in the account slot (seedFixtureSession's user).
const ACCOUNT_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-fixture-user`

/** Visit the screen's own route; /game itself always resumes to Earth Base. */
function visitWithState(state: StateOverride) {
  cy.visit(`/game/${state.screen ?? 'hub'}`, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState(state)))
      seedFixtureSession(win)
    },
  })
}

function readSavedState() {
  return cy.window().then(win => JSON.parse(win.localStorage.getItem(ACCOUNT_STORAGE_KEY) || '{}') as GameState)
}

describe('Interaction order hardening', () => {
  it('repairs context screens when persisted mission context is missing', () => {
    visitWithState({
      screen: 'fab',
      missionId: null,
      targetId: null,
    })

    // An onboarding assembly route with no mission has nothing to assemble;
    // it falls back to Earth Base, where the coach points at the contracts.
    cy.contains('h1', /^(Base|Earth Base)$/).should('be.visible')
    cy.get('[data-testid="mission-launch-review"]').should('not.exist')
    cy.get('[data-testid="bottom-tab-missions"]').click()
    cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').should('be.visible')
  })

  it('a fixed-target mission skips the target map and goes straight to the vehicle', () => {
    // lnm_m3_ore_delivery is a retired M3 slug — withCorrectedM3 (lib/catalog.ts)
    // now maps it away entirely, so it never resolves to a mission. Use a current
    // fixed-target M3 mission (lib/data/missions.ts) instead.
    visitWithState({ screen: 'hub', player: { missionsDone: 2, missionCount: 3 } })
    cy.get('[data-testid="bottom-tab-missions"]').click()
    cy.get('[data-testid="mission-accept-lnm_m3_relay_bennu_vesta"]').click()
    cy.get('[data-testid="mission-rocket-blueprint"]').should('be.visible')
    cy.get('[data-testid="mission-target-map"]').should('not.exist')
  })

  it('backs out of fixed-target rocket purchase to its fixed target, never an empty target picker', () => {
    visitWithState({ screen: 'hub', player: { missionsDone: 2, missionCount: 3 } })
    cy.get('[data-testid="bottom-tab-missions"]').click()
    cy.get('[data-testid="mission-accept-lnm_m3_relay_bennu_vesta"]').click()
    cy.get('[data-testid="mission-rocket-blueprint"]').should('be.visible')
    cy.get('[data-testid="mission-setup-scaffold"] button[aria-label="Back"]').click()
    // Back steps to the map with the mission's fixed target already selected.
    cy.get('[data-testid="target-selection-summary"]').should('contain', '101955 Bennu')
    cy.get('[data-testid="continue-build-btn"]').should('not.be.disabled')
  })

  it('drops the retired emergency-loan popup from an old save instead of offering it', () => {
    // The private emergency-loan popup was retired (lib/game-state.ts
    // normalizeState); its accept/decline paths no longer exist. A save that
    // still carries it must load without it and without touching francs.
    visitWithState({
      screen: 'hub',
      popup: 'loan',
      player: {
        francs: 100_000_000,
        loanDebt: 0,
        loanOffered: true,
      },
    })

    cy.contains('h1', /^(Base|Earth Base)$/).should('be.visible')
    cy.contains('EMERGENCY LOAN').should('not.exist')
    readSavedState().should(state => {
      expect(state.player.francs).to.eq(100_000_000)
      expect(state.player.loanDebt).to.eq(0)
    })
    cy.reload()
    cy.contains('h1', /^(Base|Earth Base)$/).should('be.visible')
    cy.contains('EMERGENCY LOAN').should('not.exist')
  })

  it('double-clicking debrief collect only completes one mission', () => {
    visitWithState({
      screen: 'debrief',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'mars',
      lastCargo: { platinum: 5 },
      player: {
        francs: 9_500_000_000,
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Platinum starter order -> Mars' },
        missionPhase: 'debrief',
        stash: { platinum: 5 },
      },
    })

    // Every debrief asks for an explicit vehicle teardown first (KES-348).
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).click()
    cy.get('[data-testid="collect-reward-btn"]').dblclick()
    // debrief settlement routes to the hub tutorial rail, not the market — see the
    // identical assertion in smoke/game-loop.cy.ts "M1 completion returns to hub".
    cy.contains('Commodity Exchange').should('not.exist')
    cy.contains('Guided Ops · Mission 2').should('be.visible')
    readSavedState().should(state => {
      expect(state.player.missionsDone).to.eq(1)
      expect(state.missionId).to.eq(null)
      expect(state.targetId).to.eq(null)
    })
  })

  it('resumes mining when the user backs out during mining', () => {
    visitWithState({
      screen: 'mining',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'mars',
      player: {
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Mars' },
        missionPhase: 'mining',
      },
    })

    cy.get('[aria-label="back"]').click()
    cy.contains('h1', /^(Base|Earth Base)$/).should('be.visible')
    cy.get('[data-testid="hub-resume-mission-btn"]').click()
    cy.location('pathname').should('eq', '/game/mining')
    cy.get('[data-testid="mining-canvas"]').should('be.visible')
  })

  it('refinery collect appears while staying on the screen after completion time passes', () => {
    const startedAt = Date.now() - (3000 * 1000 - 500)
    visitWithState({
      screen: 'refinery',
      player: {
        missionsDone: 3,
        freeOperations: true,
        refineryUnlocked: true,
        refineryBuilt: true,
        placed: ['launchpad', 'refinery'],
        placementPlots: { launchpad: 1, refinery: 2 },
        refineryQueue: [{ recipeId: 'refined-cobalt', startedAt }],
        refinedGoods: {},
      },
    })

    cy.contains('Refined Cobalt').should('be.visible')
    cy.get('[data-testid="refinery-collect-btn"]', { timeout: 2500 }).should('be.visible').click()
    readSavedState().then(state => {
      expect(state.player.refineryQueue).to.have.length(0)
      expect(state.player.refinedGoods['refined-cobalt']).to.eq(1)
    })
  })
})
