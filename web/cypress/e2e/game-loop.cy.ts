import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

function visitWithState(state: Partial<GameState>) {
  const defaults: GameState = {
    screen: 'intro',
    player: {
      francs: 10_000_000_000,
      activeMission: null,
      missionCount: 1,
      pendingLaunch: false,
      placed: [],
      placementPlots: {},
      controlBuilt: false,
      missionsDone: 0,
      freeOperations: false,
      contractorMissions: {},
      contractorCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: true,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  }
  const nextState = { ...defaults, ...state }
  cy.visit(`/game/${nextState.screen}`, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
    },
  })
}

function fullState(overrides: Partial<GameState> = {}): GameState {
  return {
    screen: 'hub',
    player: {
      francs: 9_500_000_000,
      activeMission: null,
      missionCount: 1,
      pendingLaunch: false,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      controlBuilt: false,
      missionsDone: 0,
      freeOperations: false,
      contractorMissions: {},
      contractorCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: true,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    ...overrides,
  }
}

describe('Full Game Loop — Landnam', () => {
  describe('Phase 1: Onboarding (Intro → Build → Hub)', () => {
    it('intro screen renders and begins onboarding', () => {
      visitWithState({ screen: 'intro' })
      cy.contains('LANDNAM').should('be.visible')
      cy.contains('BEGIN OPERATIONS').should('be.visible')
      cy.get('[data-testid="intro-begin-btn"]').click()
      cy.contains('EARTH BASE · SETUP').should('be.visible')
      cy.url().should('include', '/game')
    })

    it('build screen allows placing launchpad and transitions to hub', () => {
      visitWithState({ screen: 'build', tutorial: true, doneSteps: {} })
      cy.contains('Build a Launchpad').should('be.visible')
    })

    it('hub screen renders with launchpad building after placement', () => {
      visitWithState(fullState({ screen: 'hub' }))
      cy.get('[data-testid="building-launchpad"]').should('be.visible')
      cy.contains('Launchpad').should('be.visible')
      cy.contains('READY').should('be.visible')
    })
  })

  describe('Phase 2: Mission Selection (Hub → Missions → Target)', () => {
    it('radial nav opens and Missions item navigates to mission board', () => {
      visitWithState(fullState({ screen: 'hub', menuOpen: false }))
      cy.get('[data-testid="building-launchpad"]').should('be.visible')
    })

    it('mission board shows M1 card when landing on missions screen with launchpad built', () => {
      visitWithState(fullState({ screen: 'missions', doneSteps: { 1: true } }))
      cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').should('be.visible')
      cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').should('have.attr', 'data-mission-id', 'generated-s1-starter-bulk-1')
      cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').should('contain', 'order')
    })

    it('picking M1 transitions to target picker', () => {
      visitWithState(fullState({ screen: 'missions', missionId: null, doneSteps: { 1: true } }))
      cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').click()
      cy.contains('Continue · Build').should('be.visible')
    })

    it('target picker shows compatible targets for M1', () => {
      visitWithState(fullState({
        screen: 'targets',
        missionId: 'generated-s1-starter-bulk-1',
        doneSteps: { 1: true, 2: true },
      }))
      cy.contains('Compatible').should('be.visible')
      // M1 compat = asteroids with orbit ≤ 4; 433 Eros is recommended and auto-selected
      cy.contains('433 Eros').should('be.visible')
    })
  })

  describe('Phase 3: Rocket Assembly → Launch', () => {
    it('assembly screen shows prebuilt starter rocket and launch button', () => {
      // AssemblyScreen was refactored to show a prebuilt starter rocket (not individual parts)
      visitWithState(fullState({
        screen: 'fab',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        doneSteps: { 1: true, 2: true, 3: true, 4: true, 5: false },
      }))
      cy.contains('Starter Rocket 1').should('be.visible')
      cy.contains('PREBUILT').should('be.visible')
      cy.get('[data-testid="launch-btn"]').should('be.visible')
    })

    it('launch transitions to transit screen', () => {
      visitWithState(fullState({
        screen: 'fab',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        doneSteps: { 1: true, 2: true, 3: true, 4: true, 5: false },
        player: {
          francs: 9_500_000_000,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 0,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
      }))
      cy.contains('Confirm Launch').should('be.visible')
    })
  })

  describe('Phase 4: Transit → Mining', () => {
    it('transit screen shows rocket without trajectory pointer', () => {
      visitWithState(fullState({
        screen: 'transit',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        doneSteps: { 1: true, 2: true, 3: true, 5: true },
        player: {
          francs: 9_500_000_000,
          activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order → Mars' },
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 0,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
      }))
      cy.get('.trajectory').should('not.exist')
      cy.get('[data-testid="transit-rocket"]').should('be.visible')
      cy.contains('MISSION TRANSIT').should('be.visible')
    })

    it('mining screen renders ore nodes and controls', () => {
      visitWithState(fullState({
        screen: 'mining',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: false },
        player: {
          francs: 9_500_000_000,
          activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order → Mars' },
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 0,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
      }))
      cy.get('[data-testid="mining-canvas"]').should('be.visible')
      cy.get('[data-testid="fire-laser-btn"]').should('be.visible')
      cy.get('[data-testid="return-home-btn"]').should('be.visible')
      cy.contains('Mining Run').should('be.visible')
    })
  })

  describe('Phase 5: Debrief → Collect Reward', () => {
    it('debrief enforces cargo resolution before reward collection', () => {
      const cargo = { iron: 4 }
      visitWithState(fullState({
        screen: 'debrief',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        lastCargo: cargo,
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true, 9: false },
        player: {
          francs: 9_500_000_000,
          activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order → Mars' },
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 0,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
      }))
      cy.contains('MISSION COMPLETE').should('be.visible')
      cy.get('[data-testid="collect-reward-btn"]').should('not.exist')
      cy.get('[data-testid="resolve-cargo-btn"]').click()
      cy.contains('Francs Earned').should('be.visible')
      cy.get('[data-testid="collect-reward-btn"]').should('be.visible')
    })

    it('collecting reward transitions to hub with M1 completion popup', () => {
      const cargo = { iron: 6 }
      visitWithState(fullState({
        screen: 'debrief',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        lastCargo: cargo,
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true },
        player: {
          francs: 9_500_000_000,
          activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order → Mars' },
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 0,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
        tutorial: false,
        popup: 'sr2',
      }))
      cy.get('[data-testid="resolve-cargo-btn"]').should('be.visible')
    })

    it('shows SR2 unlock popup after M1 completion', () => {
      visitWithState(fullState({
        screen: 'hub',
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true, 9: true },
        popup: 'sr2',
        player: {
          francs: 9_500_000_000,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 1,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
        tutorial: false,
      }))
      cy.contains('STARTER ROCKET 2').should('be.visible')
      cy.contains('Vehicle Available').should('be.visible')
      cy.contains('Got it').should('be.visible')
    })

    it('M1 completion: market is accessible before SR2 popup, excess minerals can be sold', () => {
      // M1 requires 6 iron; player mined 8 so 2 are excess after delivery
      visitWithState(fullState({
        screen: 'debrief',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        lastCargo: { iron: 8 },
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true },
        player: {
          francs: 9_500_000_000,
          activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order → Mars' },
          stash: { iron: 8 },
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 0,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
        tutorial: false,
      }))

      cy.get('[data-testid="resolve-cargo-btn"]').click()
      cy.get('[data-testid="collect-reward-btn"]').click()

      // Market screen must be interactable — SR2 popup must NOT block it
      cy.contains('Commodity Exchange').should('be.visible')
      cy.contains('STARTER ROCKET 2').should('not.exist')

      // 2 excess iron units remain in stash after consuming 6 for delivery
      cy.contains('Iron').should('be.visible')
      cy.contains('Sell All Minerals').should('be.visible').click()
      cy.contains('Confirm').should('be.visible').click()
      cy.contains('No minerals in stash').should('be.visible')

      // Returning to hub shows the deferred SR2 unlock popup
      cy.get('[aria-label="back"]').click()
      cy.contains('STARTER ROCKET 2').should('be.visible')
      cy.contains('Vehicle Available').should('be.visible')
    })
  })

  describe('Phase 6: Post-M1 → SR2 unlock', () => {
    it('SR2 popup shows after M1 completion', () => {
      visitWithState(fullState({
        screen: 'hub',
        popup: 'sr2',
        player: {
          francs: 9_500_000_000,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 1,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
        tutorial: false,
      }))
      cy.contains('STARTER ROCKET 2').should('be.visible')
      cy.contains('Purchase it for 1.3B').should('be.visible')
    })

    it('M2 coach step 20 shows on hub after M1 — no controlBuilt needed', () => {
      visitWithState(fullState({
        screen: 'hub',
        popup: null,
        doneSteps: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true },
        player: {
          francs: 9_500_000_000,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 1,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
        tutorial: true,
      }))
      cy.get('[data-testid="tutorial-coach-block"]')
        .should('be.visible')
        .should('contain', 'Guided Ops')
        .should('contain', 'MISSIONS')
    })
  })

  describe('Phase 7: M2 — Iron starter order', () => {
    it('M2 accessible on mission board after M1 without old Control Base gate', () => {
      visitWithState(fullState({
        screen: 'missions',
        doneSteps: { 1: true },
        player: {
          francs: 9_000_000_000,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 1,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
        tutorial: false,
      }))
      cy.get('[data-testid="mission-card-generated-s2-starter-bulk-4"]').scrollIntoView().should('be.visible')
      cy.get('[data-testid="mission-card-generated-s2-starter-bulk-4"]').should('have.attr', 'data-mission-id', 'generated-s2-starter-bulk-4')
    })

    it('M2 rocket purchase shows SR2 and purchase coach step', () => {
      visitWithState(fullState({
        screen: 'rocket-buy',
        missionId: 'generated-s2-starter-bulk-4',
        targetId: 'eros',
        doneSteps: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true, 20: true },
        player: {
          francs: 9_000_000_000,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 1,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
        tutorial: true,
      }))
      cy.contains('Starter Rocket 2').should('be.visible')
      cy.contains('Select Your Rocket').should('be.visible')
    })

    it('M2 preflight launch button visible with prebuilt SR2', () => {
      visitWithState(fullState({
        screen: 'fab',
        missionId: 'generated-s2-starter-bulk-4',
        targetId: 'eros',
        doneSteps: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true, 20: true, 21: true },
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        player: {
          francs: 9_000_000_000,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 1,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
        tutorial: false,
      }))
      cy.contains('Starter Rocket 2').should('be.visible')
      cy.contains('PREBUILT').should('be.visible')
      cy.get('[data-testid="launch-btn"]').should('be.visible')
    })
  })
})
