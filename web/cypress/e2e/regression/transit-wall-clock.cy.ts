import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'
const EPOCH = 1_800_000_000_000

function transitState(now = EPOCH, elapsedMs = 0): GameState {
  const transitStartedAt = now - elapsedMs
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
      transitStartedAt,
      arrivalAt: transitStartedAt + 120_000,
    },
  } as GameState
}

function visitTransit(now = EPOCH, elapsedMs = 0, useClock = true) {
  if (useClock) cy.clock(now, ['Date'])
  cy.visit('/game/transit', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(transitState(now, elapsedMs)))
      seedFixtureSession(win)
    },
  })
  cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
}

function tutorialTransitState(now = EPOCH, elapsedMs = 0): GameState {
  const state = transitState(now, elapsedMs)
  return {
    ...state,
    tutorial: true,
    player: {
      ...state.player,
      missionsDone: 0,
      freeOperations: false,
      arrivalAt: null,
    },
  }
}

function visitTutorialTransit(now = EPOCH, elapsedMs = 0) {
  cy.clock(now, ['Date'])
  cy.visit('/game/transit', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorialTransitState(now, elapsedMs)))
      seedFixtureSession(win)
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
    const now = Date.now()
    visitTransit(now, 45_000, false)
    cy.get('.transit-readout').should($readout => {
      expect(Number($readout.attr('data-transit-progress'))).to.be.within(35, 45)
    })

    cy.reload()
    cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
    cy.get('.transit-readout').should($readout => {
      expect(Number($readout.attr('data-transit-progress'))).to.be.within(35, 50)
    })
    // The persisted wall clock is the contract, not one exact painted frame:
    // reload latency (seconds on a cold dev server) keeps counting down, but
    // the ETA must never restart from the full 02:00 leg.
    cy.get('.transit-readout').should($readout => {
      const [, minutes, seconds] = $readout.text().match(/ETA(\d{2}):(\d{2})/) ?? []
      const remaining = Number(minutes) * 60 + Number(seconds)
      expect(remaining, 'seconds remaining after remount').to.be.within(30, 75)
    })
  })

  it('keeps tutorial flight progress after the transit screen remounts', () => {
    visitTutorialTransit(EPOCH, 2_200)
    cy.get('.transit-readout').should($readout => {
      expect(Number($readout.attr('data-transit-progress'))).to.be.within(50, 60)
    })

    cy.reload()
    cy.contains('MISSION TRANSIT', { timeout: 15000 }).should('be.visible')
    cy.get('.transit-readout').should($readout => {
      expect(Number($readout.attr('data-transit-progress'))).to.be.within(50, 60)
    })
  })
})
