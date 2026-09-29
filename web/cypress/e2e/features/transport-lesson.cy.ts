// E2E tests for the Transport lesson (SSL-332 guided mission 2, a courier job
// since SSL-362) and the Storage Silo stage that opens Free Ops.

import type { GameState } from '@/game-context'
import { seedFixtureSession, showContract } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'
const COURIER_ID = 'lnm_transport_courier_vesta'

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 9_000_000_000,
    activeMission: null,
    missionCount: 2,
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
    roverDeployments: [],
    clientTerritories: {},
    ...overrides,
  }
}

function visitWithState(state: Partial<GameState>) {
  const base: GameState = {
    screen: 'hub',
    player: basePlayer(),
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true, 9: true },
    popup: null,
    menuOpen: false,
  }
  const next = { ...base, ...state }
  cy.visit(`/game/${next.screen}`, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      seedFixtureSession(win)
    },
  })
}

function courierDebrief(): Partial<GameState> {
  // The state a courier run reaches after unloading at the depot and flying
  // home: an empty hold and the delivered manifest kept as a receipt.
  return {
    screen: 'debrief',
    missionId: COURIER_ID,
    targetId: 'vesta',
    deliveryTargetId: null,
    lastCargo: {},
    deliveredCargo: { iron: 3, carbon: 2 },
    player: basePlayer({ activeMission: { id: COURIER_ID, label: 'Cargo delivery → 4 Vesta' }, missionPhase: 'debrief' }),
  }
}

describe('Transport lesson and the Storage Silo stage', () => {
  describe('Mission board — Transport availability', () => {
    it('shows both courier contracts once Extraction is done', () => {
      visitWithState({ screen: 'missions' })
      showContract(COURIER_ID).should('be.visible')
      cy.get('[data-testid="mission-board-section-client"]').should('contain', 'Vesta Depot Run')
      showContract('lnm_transport_courier_eros').should('be.visible')
      cy.get('[data-testid="mission-board-section-client"]').should('contain', 'Eros Nickel Drop')
    })

    it('reads the courier route from Earth to the depot', () => {
      visitWithState({ screen: 'missions' })
      showContract(COURIER_ID).should('be.visible')
      cy.get('[data-testid="mission-board-section-client"]').should('contain.text', 'Earth → 4 Vesta')
    })
  })

  describe('Courier contract — fixed depot', () => {
    it('picking a courier contract skips the target picker and goes straight to the vehicle', () => {
      visitWithState({ screen: 'missions' })
      showContract(COURIER_ID).click()
      cy.get('[data-testid="mission-rocket-blueprint"]', { timeout: 8000 }).should('be.visible')
      cy.get('[data-testid="mission-target-map"]').should('not.exist')
    })

    it('fab screen for the courier contract is ready to launch', () => {
      visitWithState({
        screen: 'fab',
        missionId: COURIER_ID,
        targetId: 'vesta',
        deliveryTargetId: 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
      })
      cy.contains('Vesta Depot Run').should('be.visible')
      cy.get('[data-testid="launch-btn"]').should('be.visible')
    })
  })

  describe('Transport debrief', () => {
    it('settles the courier run with no territory claim and an Earth → depot route', () => {
      visitWithState(courierDebrief())
      cy.get('[role="dialog"][aria-label="Territory established"]').should('not.exist')
      cy.contains('Vesta Depot Run').should('be.visible')
      cy.contains('Earth').should('be.visible')
    })

    it('collecting the Transport reward leads to the Storage Silo stage, not Free Ops', () => {
      visitWithState(courierDebrief())
      // Every debrief asks for an explicit vehicle teardown first (KES-348).
      cy.get('[data-testid="resolve-cargo-btn"]').click()
      cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).click()
      cy.get('[data-testid="collect-reward-btn"]').click()
      cy.get('[data-testid="tutorial-complete-sheet"]').should('not.exist')
      cy.get('[data-testid="progression-card-storage-silo"]', { timeout: 10000 }).should('exist')
      cy.window().should(win => {
        const saved = JSON.parse(win.localStorage.getItem(`${STORAGE_KEY}:user:e2e-fixture-user`) ?? '{}')
        expect(saved.player?.missionsDone).to.eq(2)
        expect(saved.player?.freeOperations).to.eq(false)
      })
    })
  })

  describe('Storage Silo stage', () => {
    it('points the mission board at the silo instead of showing an empty list', () => {
      visitWithState({ screen: 'missions', player: basePlayer({ missionsDone: 2, missionCount: 3 }) })
      cy.get('[data-testid="mission-board-awaiting-silo"]', { timeout: 10000 }).should('be.visible')
    })
  })

  describe('After Free Ops opens', () => {
    it('opens the Free Ops client catalog', () => {
      visitWithState({
        screen: 'missions',
        player: basePlayer({
          missionsDone: 2,
          missionCount: 3,
          placed: ['launchpad', 'surface-silo'],
          placementPlots: { launchpad: 0, 'surface-silo': 1 },
        }),
      })
      cy.get('[data-testid^="mission-accept-"]', { timeout: 10000 }).should('be.visible').and('not.be.disabled')
      cy.get('[data-testid="mission-board-awaiting-silo"]').should('not.exist')
    })
  })

  describe('Desktop layout', () => {
    it('game canvas fills full viewport on desktop (≥1024px)', () => {
      cy.viewport(1280, 800)
      visitWithState({ screen: 'hub' })
      cy.get('.portrait-canvas').then($el => {
        const rect = $el[0].getBoundingClientRect()
        // Desktop sidebar (~72px) reduces canvas width; check it fills most of the viewport
        expect(rect.width).to.be.at.least(1000)
        // The card sits inset by --ln-s-6 (32px) on desktop — a deliberate
        // centered-card treatment (see globals.css's "do not reintroduce
        // full-bleed" comment on .portrait-canvas), not full-bleed 100dvh.
        expect(rect.height).to.be.closeTo(768, 2)
      })
    })

    it('game canvas stays portrait-constrained on mobile (375px)', () => {
      cy.viewport(375, 812)
      visitWithState({ screen: 'hub' })
      cy.get('.portrait-canvas').then($el => {
        const rect = $el[0].getBoundingClientRect()
        expect(rect.width).to.be.lessThan(420)
      })
    })
  })
})
