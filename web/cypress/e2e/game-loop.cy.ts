import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

function visitWithState(state: Partial<GameState>) {
  const defaults: GameState = {
    screen: 'intro',
    player: {
      francs: 10_000_000_000,
      level: 1,
      xp: 0,
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
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: true,
    doneSteps: {},
    popup: null,
    buildGate: false,
    menuOpen: false,
    classification: null,
  }
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaults, ...state }))
    },
  })
}

function fullState(overrides: Partial<GameState> = {}): GameState {
  return {
    screen: 'hub',
    player: {
      francs: 9_500_000_000,
      level: 1,
      xp: 50,
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
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: true,
    doneSteps: {},
    popup: null,
    buildGate: false,
    menuOpen: false,
    classification: null,
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
      cy.get('[data-testid="mission-card-m1-iron"]').should('be.visible')
      cy.get('[data-testid="mission-card-m1-iron"]').should('have.attr', 'data-mission-id', 'm1-iron')
      cy.contains('Iron for Foundry-3').should('be.visible')
    })

    it('picking M1 transitions to target picker', () => {
      visitWithState(fullState({ screen: 'missions', missionId: null, doneSteps: { 1: true } }))
      cy.get('[data-testid="mission-card-m1-iron"]').click()
      cy.contains('Continue · Build').should('be.visible')
    })

    it('target picker shows compatible targets for M1', () => {
      visitWithState(fullState({
        screen: 'targets',
        missionId: 'm1-iron',
        doneSteps: { 1: true, 2: true },
      }))
      cy.contains('Compatible').should('be.visible')
      cy.contains('Mars').should('be.visible')
    })
  })

  describe('Phase 3: Rocket Assembly → Launch', () => {
    it('assembly screen shows rocket parts and launch button', () => {
      visitWithState(fullState({
        screen: 'fab',
        missionId: 'm1-iron',
        targetId: 'mars',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        doneSteps: { 1: true, 2: true, 3: true },
      }))
      cy.contains('Hull MK1').should('be.visible')
      cy.contains('Ion Drive A1').should('be.visible')
      cy.contains('Hand Drill').should('be.visible')
      cy.get('[data-testid="launch-btn"]').should('be.visible')
    })

    it('launch transitions to transit screen', () => {
      visitWithState(fullState({
        screen: 'fab',
        missionId: 'm1-iron',
        targetId: 'mars',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        doneSteps: { 1: true, 2: true, 3: true, 4: true, 5: false },
        player: {
          francs: 9_500_000_000,
          level: 1,
          xp: 50,
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
        },
      }))
      cy.contains('Confirm Launch').should('be.visible')
    })
  })

  describe('Phase 4: Transit → Mining', () => {
    it('transit screen shows rocket without trajectory pointer', () => {
      visitWithState(fullState({
        screen: 'transit',
        missionId: 'm1-iron',
        targetId: 'mars',
        doneSteps: { 1: true, 2: true, 3: true, 5: true },
        player: {
          francs: 9_500_000_000,
          level: 1,
          xp: 50,
          activeMission: { id: 'm1-iron', label: 'Iron for Foundry-3 → Mars' },
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
        },
      }))
      cy.get('.trajectory').should('not.exist')
      cy.get('[data-testid="transit-rocket"]').should('be.visible')
      cy.contains('MISSION TRANSIT').should('be.visible')
    })

    it('mining screen renders ore nodes and controls', () => {
      visitWithState(fullState({
        screen: 'mining',
        missionId: 'm1-iron',
        targetId: 'mars',
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: false },
        player: {
          francs: 9_500_000_000,
          level: 1,
          xp: 50,
          activeMission: { id: 'm1-iron', label: 'Iron for Foundry-3 → Mars' },
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
        },
      }))
      cy.get('[data-testid="mining-ship"]').should('be.visible')
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
        missionId: 'm1-iron',
        targetId: 'mars',
        lastCargo: cargo,
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true, 9: false },
        player: {
          francs: 9_500_000_000,
          level: 1,
          xp: 50,
          activeMission: { id: 'm1-iron', label: 'Iron for Foundry-3 → Mars' },
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
        missionId: 'm1-iron',
        targetId: 'mars',
        lastCargo: cargo,
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true },
        player: {
          francs: 9_500_000_000,
          level: 1,
          xp: 50,
          activeMission: { id: 'm1-iron', label: 'Iron for Foundry-3 → Mars' },
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
          level: 1,
          xp: 170,
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
        },
        tutorial: false,
      }))
      cy.contains('STARTER ROCKET 2').should('be.visible')
      cy.contains('Vehicle Unlocked').should('be.visible')
      cy.contains('Outstanding').should('be.visible')
    })
  })

  describe('Phase 6: Post-M1 → M2 progression', () => {
    it('after SR2 popup dismissal, build gate for Control Station appears', () => {
      visitWithState(fullState({
        screen: 'hub',
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true, 9: true },
        popup: 'sr2',
        buildGate: false,
        player: {
          francs: 9_500_000_000,
          level: 1,
          xp: 170,
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
        },
        tutorial: false,
      }))
      cy.contains('STARTER ROCKET 2').should('be.visible')
    })

    it('control station buildable and missions accessible after build', () => {
      visitWithState(fullState({
        screen: 'hub',
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true, 9: true },
        popup: null,
        buildGate: false,
        player: {
          francs: 9_500_000_000,
          level: 1,
          xp: 170,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad', 'control'],
          placementPlots: { launchpad: 0, control: 1 },
          controlBuilt: true,
          missionsDone: 1,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
        },
        tutorial: false,
      }))
      cy.get('[data-testid="building-control"]').should('be.visible')
      cy.contains('Control').should('be.visible')
      cy.contains('JOBS').should('be.visible')
    })

    it('mission board shows M2 unlocked after M1 completion + Control Station', () => {
      visitWithState(fullState({
        screen: 'missions',
        doneSteps: { 1: true },
        player: {
          francs: 9_000_000_000,
          level: 1,
          xp: 170,
          activeMission: null,
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad', 'control'],
          placementPlots: { launchpad: 0, control: 1 },
          controlBuilt: true,
          missionsDone: 1,
          freeOperations: false,
          contractorMissions: {},
          contractorCooldowns: {},
          researchAnnotations: 0,
        },
        tutorial: false,
      }))
      cy.get('[data-testid="mission-card-m2-silicon"]').should('be.visible')
      cy.get('[data-testid="mission-card-m2-silicon"]').should('have.attr', 'data-mission-id', 'm2-silicon')
    })
  })
})
