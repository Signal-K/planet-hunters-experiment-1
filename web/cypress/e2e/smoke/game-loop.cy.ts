import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

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
      clientMissions: {},
      clientCooldowns: {},
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
      seedFixtureSession(win)
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
      clientMissions: {},
      clientCooldowns: {},
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

/** Authorise the teardown and skip its Pixi scrap sequence (KES-348). */
function teardownVehicle() {
  cy.get('[data-testid="resolve-cargo-btn"]').click()
  cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).click()
}

describe('Full Game Loop — Landnam', () => {
  describe('Phase 1: Onboarding (Intro → Build → Hub)', () => {
    it('intro screen renders and begins onboarding', () => {
      visitWithState({ screen: 'intro' })
      // Intro and other chrome both say LANDNAM. Pin this to the authored
      // intro title so a compact-landscape session cannot pass against a
      // leftover rotate-to-portrait overlay (retired in SSL-326).
      cy.get('.intro-title').should('be.visible').and('contain.text', 'LANDNAM')
      cy.contains('BEGIN OPERATIONS').should('be.visible')
      cy.get('[data-testid="intro-begin-btn"]').click()
      cy.get('[data-testid="build-place-screen"]').should('be.visible')
      cy.contains('BASE · SETUP').should('be.visible')
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

    // Mission setup is one routed scene (MissionSetupRoutes): a contract
    // carousel, then target map, vehicle blueprint and launch review as
    // internal steps. The old MissionCard board and TargetPicker are gone.
    it('mission board shows the M1 contract with the coach when landing on missions', () => {
      visitWithState(fullState({ screen: 'missions', doneSteps: { 1: true } }))
      cy.get('[data-testid="tutorial-coach-block"]').should('be.visible').and('contain', 'Select a Mission')
      cy.get('[data-testid="mission-board-section-client"]').should('be.visible').and('contain', 'Helios Propulsion Depot')
      cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').should('be.visible').and('not.be.disabled')
    })

    it('M1 contract shows a nonzero eligible-target count', () => {
      visitWithState(fullState({ screen: 'missions', missionId: null, doneSteps: { 1: true } }))
      // Target count is derived from mineral/archetype coverage, not a fixed
      // number — assert it's genuinely nonzero rather than pinning an exact
      // count that shifts whenever target data legitimately changes.
      cy.get('[data-testid="mission-board-section-client"]').contains(/^[1-9]\d* ELIGIBLE TARGETS?$/).should('be.visible')
    })

    it('M1 target and rocket selection proceeds to launch review during onboarding', () => {
      visitWithState(fullState({
        screen: 'missions',
        doneSteps: { 1: true },
      }))
      cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').click()
      cy.get('[data-testid="mission-target-map"]').should('be.visible')
      cy.get('[data-testid="coach-skip-btn"]').click()
      cy.get('[data-testid="target-selection-summary"]').should('contain', 'ELIGIBLE TARGET')
      cy.get('[data-testid="continue-build-btn"]').should('not.be.disabled').click()
      cy.get('[data-testid="mission-rocket-blueprint"]').should('be.visible')
      cy.get('[data-testid="purchase-rocket-btn"]').should('contain', 'BUILD EXPLORER').click()
      // A newly built vehicle is assembled in the Hangar, then rolled out.
      cy.get('[data-testid="mission-launch-review"]').should('have.attr', 'data-location', 'hangar')
      cy.get('[data-testid="transfer-to-launchpad-btn"]').click()
      cy.get('[data-testid="mission-launch-review"]').should('have.attr', 'data-location', 'launchpad')
      cy.get('[data-testid="launch-btn"]').should('be.visible')
    })

    it('target map highlights compatible targets for M1', () => {
      visitWithState(fullState({
        screen: 'targets',
        missionId: 'generated-s1-starter-bulk-1',
        doneSteps: { 1: true, 2: true },
      }))
      cy.get('[data-testid="mission-target-map"]').should('be.visible')
      cy.contains('MISSION FILTER ACTIVE').should('be.visible')
    })
  })

  describe('Phase 3: Rocket Assembly → Launch', () => {
    it('launch review shows the prebuilt Explorer and launch button', () => {
      visitWithState(fullState({
        screen: 'fab',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        doneSteps: { 1: true, 2: true, 3: true, 4: true, 5: false },
      }))
      cy.get('[data-testid="assembly-selected-rocket"]').should('have.text', 'Explorer')
      cy.contains('ALL PARAMETERS PASS').should('be.visible')
      cy.get('[data-testid="launch-btn"]').should('be.visible').and('not.be.disabled')
    })

    it('launch runs the launch sequence and transitions to transit', () => {
      // Launch needs a built vehicle staged for this mission, so drive the
      // real setup flow rather than seeding the launch review directly.
      visitWithState(fullState({ screen: 'missions', doneSteps: { 1: true } }))
      cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').click()
      cy.get('[data-testid="coach-skip-btn"]').click()
      cy.get('[data-testid="continue-build-btn"]').click()
      cy.get('[data-testid="purchase-rocket-btn"]').click()
      cy.get('[data-testid="transfer-to-launchpad-btn"]').click()
      cy.get('[data-testid="launch-btn"]').click()
      // The dev build exposes a deterministic skip for the Pixi launch scene.
      cy.get('[data-testid="launch-sequence-skip-btn"]', { timeout: 10000 }).click()
      cy.location('pathname', { timeout: 20000 }).should('eq', '/game/transit')
      cy.get('[data-testid="transit-rocket"]').should('be.visible')
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
          clientMissions: {},
          clientCooldowns: {},
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
          clientMissions: {},
          clientCooldowns: {},
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
    it('requires Earth return and ship recovery before debrief reward is available', () => {
      const cargo = { platinum: 5 }
      visitWithState(fullState({
        screen: 'transit',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        lastCargo: cargo,
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: false },
        player: {
          francs: 9_500_000_000,
          activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Platinum starter order → Mars' },
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 0,
          freeOperations: false,
          debriefPending: true,
          returningToEarth: true,
          shipDestroyed: false,
          clientMissions: {},
          clientCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
        },
      }))

      // An onboarding return leg is untimed: the ship docks on its own, and
      // nothing is paid until the debrief is resolved and collected.
      cy.location('pathname', { timeout: 20000 }).should('eq', '/game/debrief')
      cy.contains('MISSION COMPLETE').should('be.visible')
      cy.get('[data-testid="collect-reward-btn"]').should('not.exist')
      cy.window().then(win => {
        // A signed-in save lives in the account slot.
        const saved = JSON.parse(win.localStorage.getItem(`${STORAGE_KEY}:user:e2e-fixture-user`) ?? '{}')
        expect(saved.player.francs).to.equal(9_500_000_000)
      })

      // The debrief still asks for an explicit vehicle teardown before the
      // reward (KES-348).
      teardownVehicle()
      cy.get('[data-testid="collect-reward-btn"]').should('be.visible')
    })

    it('debrief asks for vehicle teardown before the reward during onboarding (KES-348)', () => {
      const cargo = { platinum: 5 }
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
          clientMissions: {},
          clientCooldowns: {},
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
      teardownVehicle()
      cy.contains('Net').should('be.visible')
      cy.get('[data-testid="collect-reward-btn"]').should('be.visible')
    })

    it('collecting the M1 reward returns to the Hub', () => {
      const cargo = { platinum: 5 }
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
          clientMissions: {},
          clientCooldowns: {},
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
      teardownVehicle()
      cy.get('[data-testid="collect-reward-btn"]').click()
      cy.location('pathname').should('eq', '/game/hub')
    })

    it('shows Prospector unlock popup after M1 completion', () => {
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
          clientMissions: {},
          clientCooldowns: {},
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
      cy.contains('PROSPECTOR').should('be.visible')
      cy.contains('Vehicle Available').should('be.visible')
      cy.contains('Select Prospector').should('be.visible')
    })

    it('M1 completion returns to hub with Prospector popup and does not open the market', () => {
      // M1 requires 5 platinum; player mined 7 so 2 are excess after delivery
      visitWithState(fullState({
        screen: 'debrief',
        missionId: 'generated-s1-starter-bulk-1',
        targetId: 'mars',
        lastCargo: { platinum: 7 },
        doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true },
        player: {
          francs: 9_500_000_000,
          activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order → Mars' },
          stash: { platinum: 7 },
          missionCount: 1,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 0,
          freeOperations: false,
          clientMissions: {},
          clientCooldowns: {},
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

      teardownVehicle()
      cy.get('[data-testid="collect-reward-btn"]').click()

      cy.contains('Commodity Exchange').should('not.exist')
      cy.contains('Guided Ops · Mission 2').should('be.visible')
      // The M2 coach opens collapsed; its body still names the new vehicle.
      cy.contains('Prospector is now available').should('exist')
    })
  })

  describe('Phase 6: Post-M1 → Prospector unlock', () => {
    it('Prospector popup shows after M1 completion', () => {
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
          clientMissions: {},
          clientCooldowns: {},
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
      cy.contains('PROSPECTOR').should('be.visible')
      cy.contains('Vehicle Available').should('be.visible')
      cy.contains('Select Prospector').should('be.visible')
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
          clientMissions: {},
          clientCooldowns: {},
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
          clientMissions: {},
          clientCooldowns: {},
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
      cy.get('[data-testid^="mission-accept-generated-s2-"]').should('be.visible').and('not.be.disabled')
    })

    it('M2 rocket purchase shows Prospector and purchase coach step', () => {
      visitWithState(fullState({
        screen: 'rocket-buy',
        missionId: 'generated-s2-volatile-bulk-4',
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
          clientMissions: {},
          clientCooldowns: {},
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
      cy.contains('Prospector').should('be.visible')
      cy.contains('Select Your Rocket').should('be.visible')
    })

    it('M2 preflight launch button visible with prebuilt Prospector', () => {
      visitWithState(fullState({
        screen: 'fab',
        missionId: 'generated-s2-volatile-bulk-4',
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
          clientMissions: {},
          clientCooldowns: {},
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
      cy.get('[data-testid="assembly-selected-rocket"]').should('have.text', 'Prospector')
      cy.get('[data-testid="launch-btn"]').should('be.visible')
    })
  })
})
