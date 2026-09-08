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
