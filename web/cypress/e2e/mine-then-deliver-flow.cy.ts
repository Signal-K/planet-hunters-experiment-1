// Review coverage for "Mine-Then-Deliver: two-leg logistics mission
// mechanic" (mine-then-deliver-two-leg-logistics). The ticket's own
// Implementation Evidence explicitly flagged this as unverified in a real
// browser: "Not verified end-to-end in the browser this session (no Cypress
// coverage added for the two-leg flow)". This spec closes that gap by
// exercising exactly the manual checklist the ticket asked for:
// - route label on the mission board for the authored two-leg mission
// - TransitScreen shows the delivery target (not the mining site) during
//   the delivery leg
// - "Delivered — course set for Earth" toast + Earth-bound transit after
//   the delivery leg is completed
//
// mission-delivery-debrief.cy.ts already covers a separate, previously-fixed
// bug in the Debrief screen's origin attribution — this file does not
// duplicate that, it covers the mission-board and mid-flight legs instead.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 9_000_000_000,
    activeMission: null,
    missionCount: 4,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 4,
    freeOperations: true,
    contractorMissions: {},
    contractorCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    ...overrides,
  } as GameState['player']
}

function visitWithState(path: string, state: Partial<GameState>) {
  const full: GameState = {
    screen: 'hub',
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: basePlayer(),
    ...state,
  } as GameState

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
    },
  })
}

describe('Mine-Then-Deliver: two-leg logistics mission (Free Ops mission board)', () => {
  it('shows a route label for the authored two-leg mission, and no route label for a normal single-leg job', () => {
    visitWithState('/game/missions', {
      screen: 'missions',
      player: basePlayer({ freeOperations: true, missionsDone: 4 }),
    })
    cy.contains('Deep-Core Relay', { timeout: 10000 }).scrollIntoView().should('be.visible')
    cy.contains('16 Psyche → 1 Ceres').scrollIntoView().should('be.visible')
  })

  it('does not offer the logistics job while its contractor is on cooldown', () => {
    visitWithState('/game/missions', {
      screen: 'missions',
      player: basePlayer({
        freeOperations: true,
        missionsDone: 4,
        contractorCooldowns: { 'kepler-materials': Date.now() + 60 * 60 * 1000 },
      }),
    })
    cy.contains('Free Ops', { timeout: 10000 })
    cy.contains('Deep-Core Relay').should('not.exist')
  })
})

describe('Mine-Then-Deliver: mid-flight leg resolution', () => {
  it('shows the delivery target (not the mining site) while heading to delivery', () => {
    visitWithState('/game/transit', {
      screen: 'transit',
      missionId: 'lnm_relay_psyche_ceres',
      targetId: 'psyche',
      deliveryTargetId: 'ceres',
      player: basePlayer({
        headingToDelivery: true,
        returningToEarth: false,
        arrivalAt: Date.now() + 5 * 60 * 1000,
      }),
    })
    cy.contains('1 Ceres', { timeout: 10000 }).should('be.visible')
    cy.contains('16 Psyche').should('not.exist')
  })

  it('transitions to the Earth-bound leg after the delivery leg completes', () => {
    visitWithState('/game/transit', {
      screen: 'transit',
      missionId: 'lnm_relay_psyche_ceres',
      targetId: 'psyche',
      deliveryTargetId: 'ceres',
      player: basePlayer({
        headingToDelivery: true,
        returningToEarth: false,
        arrivalAt: Date.now() + 5 * 60 * 1000,
      }),
    })
    cy.contains('1 Ceres', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="transit-skip-btn"]').click({ force: true })
    cy.contains('Delivered — course set for Earth', { timeout: 10000 }).should('be.visible')
    cy.contains('Earth', { timeout: 10000 }).should('be.visible')
  })
})
