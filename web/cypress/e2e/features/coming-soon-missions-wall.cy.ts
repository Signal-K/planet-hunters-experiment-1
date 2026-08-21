// Review coverage for "'Coming soon' locked missions wall: rovers,
// colonies, settlements" (coming-soon-locked-missions-wall). The ticket's
// own Implementation Evidence notes a full interactive browser walkthrough
// was not performed live — this closes that gap by driving real navigation
// to the Free Ops mission board and asserting the acceptance criteria:
// locked entries are visible, labeled "Coming Soon", and inert (no
// click-through to a broken/unbuilt feature).

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
    clientMissions: {},
    clientCooldowns: {},
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

function visitMissionBoard(playerOverrides: Partial<GameState['player']> = {}) {
  const full: GameState = {
    screen: 'missions',
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: basePlayer(playerOverrides),
  } as GameState

  cy.visit('/game/missions', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
    },
  })
}

describe('"Coming soon" locked missions wall (Free Ops mission board)', () => {
  it('shows rovers, colonies, and settlements as locked "Coming Soon" entries', () => {
    visitMissionBoard({ freeOperations: true })
    cy.contains('Future Operations', { timeout: 10000 }).scrollIntoView().should('be.visible')
    for (const label of ['Rover Deployment', 'Colonies', 'Settlements']) {
      cy.contains(label).scrollIntoView().should('be.visible')
      cy.contains(label).parents('[aria-disabled="true"]').first().should('contain.text', 'Coming Soon')
    }
  })

  it('does not show the coming-soon wall during onboarding (Free Ops not yet unlocked)', () => {
    visitMissionBoard({ freeOperations: false, missionsDone: 0 })
    cy.contains('Rover Deployment').should('not.exist')
  })

  it('locked entries are inert — clicking does not navigate away from the mission board', () => {
    visitMissionBoard({ freeOperations: true })
    cy.contains('Rover Deployment', { timeout: 10000 }).scrollIntoView()
    cy.contains('Rover Deployment')
      .parents('[aria-disabled="true"]')
      .first()
      .click({ force: true })
    // Still on the mission board — a click-through would have navigated to
    // a target picker, rocket-buy, or transit screen instead.
    cy.contains('Future Operations').should('be.visible')
    cy.contains('Rover Deployment').should('be.visible')
  })
})
