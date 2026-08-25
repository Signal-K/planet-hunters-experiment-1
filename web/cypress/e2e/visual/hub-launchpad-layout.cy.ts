import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const

function state(screen: GameState['screen']): GameState {
  return {
    screen,
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    player: {
      francs: 50_000_000,
      activeMission: null,
      pendingLaunch: true,
      missionCount: 4,
      missionsDone: 3,
      placed: ['launchpad', 'refinery', 'scan-station', 'transit-telescope'],
      placementPlots: { launchpad: 0, refinery: 1, 'scan-station': 2, 'transit-telescope': 3 },
      controlBuilt: true,
      freeOperations: true,
      clientMissions: {},
      clientStreaks: {},
      clientCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: true,
      refineryUnlocked: true,
      refineryUnlockNotified: true,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
      seen_planets: [],
      roverDeployments: [],
      clientTerritories: {},
      scannerBuilt: true,
      transitSatelliteLaunchedAt: Date.now() - 60_000,
      transitSatelliteLevel: 1,
      tessClassifications: {},
    },
  } as GameState
}

function visit(path: string, screen: GameState['screen']) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state(screen)))
      win.localStorage.setItem(SURVEY_KEY, JSON.stringify(['lnm_first_launch']))
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
      win.localStorage.setItem('landnam-launchpad-guide-v1', 'complete')
      // The fixtures intentionally exercise persisted post-onboarding screens.
      // A stored returning-account credential keeps the auth gate from
      // covering those local-only visual contracts while the remote backend is
      // unavailable in this Docker visual runner.
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
        email: 'e2e@example.com', password: 'e2e-guest-test',
      }))
    },
  })
}

describe('Hub and Launchpad visual layout', () => {
  for (const viewport of VIEWPORTS) {
    it(`shows authored hub structures at ${viewport.name} size`, () => {
      cy.viewport(viewport.width, viewport.height)
      visit('/game', 'hub')
      cy.contains('h1', 'Earth Base', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid="building-launchpad-hit"]').should('be.visible')
      cy.get('[data-testid="building-refinery-hit"]').should('be.visible')
      cy.get('[data-testid="building-scan-station-hit"]').should('be.visible')
      cy.screenshot(`hub-authored-structures-${viewport.name}`)
    })

    it(`keeps the Launchpad scene and actions clear at ${viewport.name} size`, () => {
      cy.viewport(viewport.width, viewport.height)
      visit('/game/launchpad', 'launchpad')
      cy.contains('h1', 'Your Program', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid="launchpad-status-card"]').should('be.visible')
      cy.get('[data-testid="launchpad-rocket-fleet"]').should('be.visible')
      cy.get('[data-testid="launchpad-open-subsurface-btn"]').scrollIntoView().should('be.visible')
      cy.get('[data-testid="launchpad-program-operation-btn"]').scrollIntoView().should('be.visible')
      cy.get('[data-testid="launchpad-view-contracts-btn"]').scrollIntoView().should('be.visible')
      cy.screenshot(`launchpad-scene-${viewport.name}`)
    })
  }
})
