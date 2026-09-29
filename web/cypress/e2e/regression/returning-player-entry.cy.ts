import type { GameState } from '../../../game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'

const RETURNING_PLAYER = {
  screen: 'missions',
  tutorial: false,
  player: {
    missionsDone: 3,
    freeOperations: true,
    placed: ['launchpad'],
  },
} as unknown as Partial<GameState>

describe('returning player entry route', () => {
  it('opens Earth Base instead of restoring the Contracts screen', () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(RETURNING_PLAYER))
        seedFixtureSession(win)
      },
    })

    cy.location('pathname', { timeout: 10_000 }).should('eq', '/game/hub')
    cy.get('[data-testid="hub-terrain-fallback"]', { timeout: 10_000 }).should('exist')
    cy.get('h1').invoke('text').should('match', /^(Base|Earth Base)$/)
  })
})
