// SSL-341: a structure placed from the Build screen must still be on Earth
// Base after a reload, both from this device's save and, on a new device,
// from the game_states row the placement was synced to.
import { seedAuthenticatedFixture, seedFixtureSession, type FixtureState } from '../../support/authenticated-fixture'

const USER_ID = 'e2e-placement-user'
const STORAGE_KEY = 'landnam-game-state-v1'
const ACCOUNT_KEY = `${STORAGE_KEY}:user:${USER_ID}`

const FREE_OPS_BASE: FixtureState = {
  screen: 'hub',
  tutorial: false,
  missionId: null,
  targetId: null,
  doneSteps: {},
  popup: null,
  player: {
    francs: 50_000_000_000,
    missionsDone: 3,
    freeOperations: true,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    stash: { aluminium: 100, copper: 100, silicon: 100 },
  },
}

interface SavedState { player?: { placed?: string[]; placementPlots?: Record<string, number> } }

function placedIn(raw: string | null): string[] {
  return raw ? (JSON.parse(raw) as SavedState).player?.placed ?? [] : []
}

describe('placed structure persistence (SSL-341)', () => {
  it('keeps a Build-screen placement after a reload and on a new device', () => {
    const synced: SavedState[] = []
    cy.intercept('POST', '**/api/collections/game_states/records', req => {
      synced.push((req.body as { state: SavedState }).state)
      req.reply({ statusCode: 200, body: { id: 'e2e-game-state', user: USER_ID, state: req.body.state } })
    })
    cy.intercept('PATCH', '**/api/collections/game_states/records/*', req => {
      synced.push((req.body as { state: SavedState }).state)
      req.reply({ statusCode: 200, body: { id: 'e2e-game-state', user: USER_ID, state: req.body.state } })
    })

    cy.visit('/game/hub', {
      onBeforeLoad: win => seedAuthenticatedFixture(win, FREE_OPS_BASE, USER_ID),
    })
    cy.get('[data-testid="hub-edit-build-btn"]', { timeout: 15_000 }).click()
    cy.get('[data-testid="hub-new-structure-btn"]').click()
    cy.get('[data-testid="build-place-screen"]', { timeout: 15_000 }).should('be.visible')
    cy.contains('button', 'Surface Silo').click()
    cy.get('[data-testid="build-plot-2"]').click()
    cy.contains('button', 'Confirm · Build Here').click()
    cy.location('pathname').should('eq', '/game/hub')
    cy.window().should(win => {
      expect(placedIn(win.localStorage.getItem(ACCOUNT_KEY))).to.include('surface-silo')
    })

    // Same device: reload from the local save.
    cy.reload()
    cy.get('[data-testid="building-surface-silo"]', { timeout: 15_000 }).should('exist')
    cy.window().should(win => {
      expect(placedIn(win.localStorage.getItem(ACCOUNT_KEY))).to.include('surface-silo')
    })

    // The placement reached game_states.state.
    cy.wrap(synced).should(rows => {
      expect(rows.some(state => state.player?.placed?.includes('surface-silo'))).to.equal(true)
    })

    // New device: no local save, only the synced game_states row.
    cy.then(() => {
      const latest = [...synced].reverse().find(state => state.player?.placed?.includes('surface-silo'))
      cy.intercept('GET', '**/api/collections/game_states/records*', {
        statusCode: 200,
        body: { page: 1, perPage: 1, totalItems: 1, totalPages: 1, items: [{ id: 'e2e-game-state', user: USER_ID, state: latest, updated: new Date().toISOString() }] },
      })
      cy.visit('/game/hub', {
        onBeforeLoad: win => {
          win.localStorage.clear()
          seedFixtureSession(win, USER_ID)
        },
      })
    })
    cy.get('[data-testid="building-surface-silo"]', { timeout: 15_000 }).should('exist')
    cy.window().should(win => {
      expect(placedIn(win.localStorage.getItem(ACCOUNT_KEY))).to.include('surface-silo')
    })
  })
})
