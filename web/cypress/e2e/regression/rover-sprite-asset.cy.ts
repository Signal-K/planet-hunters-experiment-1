import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

function visitRoverMining() {
  const state = {
    screen: 'rover-mining',
    missionId: 'generated-s1-starter-bulk-1',
    targetId: 'eros',
    deliveryTargetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: {
      francs: 15_000_000_000,
      activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Rover landing -> Eros' },
      missionCount: 4,
      pendingLaunch: false,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      missionsDone: 3,
      skillPoints: 0,
      unlockedSkillNodes: [],
      freeOperations: true,
      clientMissions: {},
      clientStreaks: {},
      clientCooldowns: {},
      researchAnnotations: 0,
      roverDeployments: [],
      roverMiningStartedAt: Date.now() - 5_000,
      roverTerrainClassifications: { eros: 'vein' },
      clientTerritories: {},
      tessClassifications: {},
    },
  } as unknown as GameState

  cy.visit('/game/rover-mining', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
    },
  })
}

describe('Sprint 13 rover visual polish (KES-166)', () => {
  it('loads the playable TakeOn rover scene', () => {
    visitRoverMining()

    cy.contains('Rover Mining', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="rover-mining-screen"] canvas[aria-label]', { timeout: 10000 }).should('be.visible')
  })
})

// SSL-27: these are real compact landscape viewports, rather than portrait
// dimensions labelled as landscape. The deploy handoff must not compete with
// the cargo HUD, and both primary actions need an in-viewport 44px target.
const COMPACT_LANDSCAPE_VIEWPORTS = [
  { key: '844x390', width: 844, height: 390 },
  { key: '926x428', width: 926, height: 428 },
] as const

function expectTappableInViewport(selector: string) {
  cy.get(selector, { timeout: 10000 }).should('be.visible').then($button => {
    const rect = $button[0].getBoundingClientRect()
    expect(rect.width, `${selector} width`).to.be.at.least(44)
    expect(rect.height, `${selector} height`).to.be.at.least(44)
    expect(rect.top, `${selector} top edge`).to.be.at.least(0)
    expect(rect.bottom, `${selector} bottom edge`).to.be.at.most(Cypress.config('viewportHeight'))
  })
}

describe('Rover mining compact landscape (SSL-27)', () => {
  COMPACT_LANDSCAPE_VIEWPORTS.forEach(({ key, width, height }) => {
    it(`[${key}] keeps deploy and return actions in the viewport`, () => {
      cy.viewport(width, height)
      visitRoverMining()

      expectTappableInViewport('[data-testid="deploy-surface-ops-confirm"]')
      cy.get('[data-testid="deploy-surface-ops-confirm"]').click()
      expectTappableInViewport('[data-testid="rover-return-to-ship"]')
    })
  })
})
