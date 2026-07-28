import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const EPOCH = 1_800_000_000_000

function transitState(): GameState {
  return {
    screen: 'transit',
    missionId: 'generated-s1-starter-bulk-1',
    targetId: 'eros',
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: {
      francs: 9_000_000_000,
      activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Starter Bulk → 433 Eros' },
      missionRunId: 'e2e-run',
      missionPhase: 'transit',
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
      transitStartedAt: EPOCH,
      arrivalAt: EPOCH + 120_000,
    },
  } as GameState
}

function visitTransit() {
  cy.clock(EPOCH, ['Date'])
  cy.visit('/game/transit', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(transitState()))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
    },
  })
  cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
}

describe('Transit wall-clock continuity', () => {
  it('continues ETA and visual progress while the document is hidden', () => {
    visitTransit()
    cy.get('.transit-readout').should('contain', '02:00')
    cy.get('.transit-readout').should('have.attr', 'data-transit-progress', '0')

    cy.tick(30_000)
    cy.get('.transit-readout').should('contain', '01:30')
    cy.get('.transit-readout').should('have.attr', 'data-transit-progress', '25')

    cy.document().then(document => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    cy.tick(60_000)
    cy.document().then(document => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    cy.get('.transit-readout').should('contain', '00:30')
    cy.get('.transit-readout').should('have.attr', 'data-transit-progress', '75')
  })

  it('keeps the same travel position after the transit screen remounts', () => {
    visitTransit()
    cy.tick(45_000)
    cy.get('.transit-readout').should('have.attr', 'data-transit-progress', '38')

    cy.reload()
    cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
    cy.get('.transit-readout').should('have.attr', 'data-transit-progress', '38')
    cy.get('.transit-readout').should('contain', '01:15')
  })
})
