import type { GameState } from '../../../game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const ACCOUNT_KEY = 'landnam-account-credentials'

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
        win.localStorage.setItem(ACCOUNT_KEY, JSON.stringify({
          email: 'e2e@example.com',
          password: 'e2e-guest-test',
        }))
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(RETURNING_PLAYER))
      },
    })

    cy.location('pathname', { timeout: 10_000 }).should('eq', '/game/hub')
    cy.get('[data-testid="hub-skyline-fallback"]', { timeout: 10_000 }).should('exist')
    cy.get('h1').should('contain.text', 'Earth Base')
  })
})
