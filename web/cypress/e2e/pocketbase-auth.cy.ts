describe('PocketBase Guest Auth Pattern', () => {
  const pbUrl = Cypress.env('POCKETBASE_URL') || 'http://localhost:8090'
  const STORAGE_KEY = 'landnam-game-state-v1'
  const PB_AUTH_KEY = 'pocketbase_auth'

  let guestId: string
  let guestPassword: string
  let token: string
  let record: Record<string, unknown>

  before(() => {
    guestId = `guest_${Math.random().toString(36).substring(7)}`
    guestPassword = 'GuestPassword123!'

    cy.request('POST', `${pbUrl}/api/collections/users/records`, {
      email: `${guestId}@landnam.test`,
      password: guestPassword,
      passwordConfirm: guestPassword,
      displayName: 'Anonymous Explorer',
    }).then(({ body: userRecord }) => {
      cy.request('POST', `${pbUrl}/api/collections/users/auth-with-password`, {
        identity: `${guestId}@landnam.test`,
        password: guestPassword,
      }).then(({ body: auth }) => {
        token = auth.token
        record = auth.record
      })
    })
  })

  after(() => {
    if (record?.id) {
      cy.request({
        method: 'DELETE',
        url: `${pbUrl}/api/collections/users/records/${record.id}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
    }
  })

  beforeEach(() => {
    cy.clearAllSessionStorage()
    cy.clearAllLocalStorage()
    // Clean any game_states left over from a failed previous run
    if (token && record?.id) {
      cy.request({
        method: 'DELETE',
        url: `${pbUrl}/api/collections/game_states/records?filter=${encodeURIComponent(`user = "${record.id}"`)}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
    }
  })

  function makeState(screen = 'hub') {
    return {
      screen,
      player: {
        francs: 9_500_000_000,
        activeMission: null,
        missionCount: 1,
        pendingLaunch: false,
        placed: ['launchpad'],
        placementPlots: { launchpad: 0 },
        controlBuilt: false,
        missionsDone: 0,
        freeOperations: false,
        contractorMissions: {},
        contractorCooldowns: {},
        researchAnnotations: 0,
        refineryBuilt: false,
        refineryQueue: [],
        refinedGoods: {},
        launchpadUpgraded: false,
        loanDebt: 0,
        loanOffered: false,
      },
      missionId: null,
      targetId: null,
      rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
      lastCargo: null,
      tutorial: true,
      doneSteps: {},
      popup: null,
      menuOpen: false,
    }
  }

  function injectAuth(win: Window) {
    win.localStorage.setItem(PB_AUTH_KEY, JSON.stringify({ token, record }))
  }

  it('should persist game state to PB and restore it after localStorage is cleared', () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        injectAuth(win)
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState('hub')))
      },
    })

    cy.contains('BASE', { timeout: 15000 }).should('be.visible')
    cy.wait(3000)

    cy.request({
      method: 'GET',
      url: `${pbUrl}/api/collections/game_states/records?filter=${encodeURIComponent(`user = "${record.id}"`)}`,
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ body }) => {
      expect(body.items).to.have.length(1)
      const savedState = body.items[0].state as Record<string, unknown>
      expect(savedState.screen).to.eq('hub')
    })

    cy.clearAllLocalStorage()

    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        injectAuth(win)
      },
    })

    cy.contains('BASE', { timeout: 15000 }).should('be.visible')
    cy.wait(3000)

    cy.window().then(win => {
      const restored = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}')
      expect(restored.screen).to.eq('hub')
      expect(restored.player.francs).to.eq(9_500_000_000)
    })
  })
})
