export {}

const ORIENTATION_STORAGE_KEY = 'landnam-game-state-v1'
const PHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

const HUB_STATE = {
  screen: 'hub',
  missionId: null,
  targetId: null,
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
  tutorial: false,
  doneSteps: {},
  popup: null,
  menuOpen: false,
  player: {
    francs: 9_500_000_000,
    activeMission: null,
    pendingLaunch: false,
    missionsDone: 0,
    missionCount: 0,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    freeOperations: false,
    clientMissions: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
  },
}

function seedAuthenticatedHub(win: Cypress.AUTWindow) {
  win.localStorage.setItem(ORIENTATION_STORAGE_KEY, JSON.stringify(HUB_STATE))
  win.localStorage.setItem(
    'landnam-account-credentials',
    JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }),
  )
  win.localStorage.setItem('landnam-surveys-shown', JSON.stringify(['lnm_first_launch']))
}

function assertNoRotateWall() {
  cy.get('[data-testid="portrait-required-overlay"]').should('not.exist')
  cy.contains(/rotate to portrait/i).should('not.exist')
}

describe('Compact landscape play path (SSL-326)', () => {
  it('lets a phone-UA compact landscape session play the hub without a rotate wall', () => {
    cy.viewport(844, 390)
    cy.visit('/game/hub', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'userAgent', { configurable: true, value: PHONE_UA })
        seedAuthenticatedHub(win)
      },
    })

    assertNoRotateWall()
    cy.get('[data-testid="building-launchpad"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="settings-button"]').should('be.visible')
    cy.get('.bottom-tab-bar').should('be.visible')
    cy.get('[data-testid="portrait-required-overlay"]').should('not.exist')
    cy.screenshot('mobile-landscape-hub-playable')
  })

  it('keeps account controls reachable at 844×390 instead of blocking behind a rotate wall', () => {
    cy.viewport(844, 390)
    cy.visit('/game', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'userAgent', { configurable: true, value: PHONE_UA })
        win.localStorage.removeItem(ORIENTATION_STORAGE_KEY)
        win.localStorage.removeItem('landnam-account-credentials')
      },
    })

    assertNoRotateWall()
    cy.get('[data-testid="auth-gate-quick-email"]', { timeout: 15000 })
      .scrollIntoView()
      .should('be.visible')
    cy.get('[data-testid="auth-gate-quick-submit"]').scrollIntoView().should('be.visible')
    cy.contains('button', /create account/i).click()
    cy.get('[data-testid="auth-gate-email"]').scrollIntoView().should('be.visible')
    cy.get('[data-testid="auth-gate-password"]').scrollIntoView().should('be.visible')
    cy.get('[data-testid="auth-gate-submit"]').scrollIntoView().should('be.visible')
    cy.screenshot('mobile-landscape-auth-reachable')
  })

  it('lets 926×428 play without a rotate wall', () => {
    cy.viewport(926, 428)
    cy.visit('/game/hub', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'userAgent', { configurable: true, value: PHONE_UA })
        seedAuthenticatedHub(win)
      },
    })

    assertNoRotateWall()
    cy.get('[data-testid="building-launchpad"]', { timeout: 15000 }).should('be.visible')
    cy.screenshot('compact-landscape-926-hub-playable')
  })

  it('does not block the supported desktop landscape layout', () => {
    cy.viewport(1280, 800)
    cy.visit('/game/hub', {
      onBeforeLoad(win) {
        seedAuthenticatedHub(win)
      },
    })
    assertNoRotateWall()
    cy.get('[data-testid="building-launchpad"]', { timeout: 15000 }).should('be.visible')
  })

  it('keeps phone portrait as a first-class play path', () => {
    cy.viewport(390, 844)
    cy.visit('/game/hub', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'userAgent', { configurable: true, value: PHONE_UA })
        seedAuthenticatedHub(win)
      },
    })
    assertNoRotateWall()
    cy.get('[data-testid="building-launchpad"]', { timeout: 15000 }).should('be.visible')
    cy.get('.bottom-tab-bar').should('be.visible')
  })
})
