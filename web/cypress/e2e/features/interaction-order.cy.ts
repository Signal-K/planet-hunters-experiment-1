import type { GameState } from '@/game-context'

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

function visitWithState(state: StateOverride) {
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState(state)))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({
        email: 'e2e@landnam.guest',
        password: 'e2e-guest-test',
      }))
    },
  })
}

function readSavedState() {
  return cy.window().then(win => JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as GameState)
}

describe('Interaction order hardening', () => {
  it('repairs context screens when persisted mission context is missing', () => {
    visitWithState({
      screen: 'fab',
      missionId: null,
      targetId: null,
    })

    cy.contains('Mission Board').should('be.visible')
    cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').should('be.visible')
  })

  it('repairs fixed-target mission target picker resumes to rocket purchase', () => {
    visitWithState({
      screen: 'targets',
      missionId: 'lnm_m3_ore_delivery',
      targetId: null,
      player: { missionsDone: 2, missionCount: 3 },
    })

    cy.contains('Select Rocket').should('be.visible')
    cy.contains('Pick Target').should('not.exist')
  })

  it('backs out of fixed-target rocket purchase to missions instead of empty target picker', () => {
    visitWithState({
      screen: 'rocket-buy',
      missionId: 'lnm_m3_ore_delivery',
      targetId: 'lutetia',
      player: { missionsDone: 2, missionCount: 3 },
    })

    cy.contains('Select Rocket').should('be.visible')
    cy.get('[aria-label="back"]').click()
    cy.contains('Mission Board').should('be.visible')
    cy.contains('Pick Target').should('not.exist')
  })

  it('scrim dismisses emergency loan instead of accepting it', () => {
    visitWithState({
      screen: 'hub',
      popup: 'loan',
      player: {
        francs: 100_000_000,
        loanDebt: 0,
        loanOffered: true,
      },
    })

    cy.contains('EMERGENCY LOAN').should('be.visible')
    cy.get('[data-testid="unlock-popup-scrim"]').click('topLeft')
    cy.contains('EMERGENCY LOAN').should('not.exist')
    readSavedState().then(state => {
      expect(state.player.francs).to.eq(100_000_000)
      expect(state.player.loanDebt).to.eq(0)
      expect(state.popup).to.eq(null)
    })
  })

  it('accepts emergency loan only through the primary action', () => {
    visitWithState({
      screen: 'hub',
      popup: 'loan',
      player: {
        francs: 100_000_000,
        loanDebt: 0,
        loanOffered: true,
      },
    })

    cy.get('[data-testid="unlock-popup-primary"]').click()
    readSavedState().then(state => {
      expect(state.player.francs).to.eq(5_100_000_000)
      expect(state.player.loanDebt).to.be.greaterThan(0)
      expect(state.popup).to.eq(null)
    })
  })

  it('double-clicking debrief collect only completes one mission', () => {
    visitWithState({
      screen: 'debrief',
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'mars',
      lastCargo: { iron: 6 },
      player: {
        francs: 9_500_000_000,
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Mars' },
        missionPhase: 'debrief',
        stash: { iron: 6 },
      },
    })

    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.get('[data-testid="collect-reward-btn"]').dblclick()
    cy.contains('Commodity Exchange').should('be.visible')
    readSavedState().then(state => {
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
    cy.contains('Earth Base').should('be.visible')
    cy.get('[data-testid="progression-card-active"]').click()
    cy.contains('Mining Run').should('be.visible')
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
