// E2E coverage for kkhyll's desktop two-column TessDiscoveryScreen layout —
// see z9cjo7-implement-kkhyll-desktop-two-column-layout. Mobile portrait
// stays single-column (unchanged); desktop (>=1024px) splits into a 55%
// lightcurve column and a 45% metadata + actions column.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

function visitGalaxyScreen() {
  const tokenPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  const e2eToken = `e30.${tokenPayload}.test`
  cy.intercept('POST', '**/api/collections/users/auth-refresh', {
    statusCode: 200,
    body: { token: e2eToken, record: { id: 'e2e-subject-user', email: 'e2e@landnam.guest' } },
  })
  cy.intercept('POST', '**/api/landnam-auth/exchange', {
    statusCode: 200,
    body: { token: e2eToken, record: { id: 'e2e-subject-user' } },
  })
  cy.intercept('GET', '**/api/collections/subjects/records*', {
    statusCode: 200,
    body: {
      page: 1,
      perPage: 500,
      totalItems: 1,
      totalPages: 1,
      items: [{
        id: 'subj-toi-1000',
        subject_type: 'transit',
        gold_label: '',
        consensus: '',
        toi_id: '1000.01',
        tic_id: '12345678',
        period_days: 4.2,
        depth_ppm: 1200,
        distance_ly: 150,
        constellation: 'Lyra',
        signal_to_noise: 18,
        planet_radius_earth: 1.4,
      }],
    },
  }).as('subjects')

  const base: GameState = {
    screen: 'galaxy',
    player: {
      francs: 9_000_000_000,
      activeMission: null,
      missionCount: 3,
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
      roverDeployments: [],
      clientTerritories: {},
      satelliteMonitoringBuilt: true,
      transitSatelliteLaunchedAt: Date.now() - 1000,
      tessClassifications: {},
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  }

  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(base))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
      win.localStorage.setItem('pocketbase_auth', JSON.stringify({ token: e2eToken, record: { id: 'e2e-subject-user', email: 'e2e@landnam.guest' } }))
    },
  })
  cy.wait('@subjects')
}

describe('TessDiscoveryScreen — desktop two-column layout', () => {
  it('renders a single-column stack on mobile (unchanged)', () => {
    cy.viewport(390, 844)
    visitGalaxyScreen()
    // STS-582 renamed this screen's header copy from "TESS Anomaly" to the
    // instrument-feed framing (TopBar eyebrow + the candidate's own TOI id).
    cy.contains('INSTRUMENT DATA FEED', { timeout: 10000 }).should('be.visible')
    cy.contains('TOI 1000.01').should('be.visible')
    cy.get('[data-testid="tess-discovery-desktop-grid"]').should('not.exist')
    cy.get('[data-testid="tess-verdict-planet"]').should('exist')
  })

  it('renders a two-column grid on desktop (>=1024px)', () => {
    cy.viewport(1280, 800)
    visitGalaxyScreen()
    // STS-582 renamed this screen's header copy from "TESS Anomaly" to the
    // instrument-feed framing (TopBar eyebrow + the candidate's own TOI id).
    cy.contains('INSTRUMENT DATA FEED', { timeout: 10000 }).should('be.visible')
    cy.contains('TOI 1000.01').should('be.visible')
    cy.get('[data-testid="tess-discovery-desktop-grid"]').should('be.visible').then($grid => {
      expect($grid.css('display')).to.eq('grid')
    })
    cy.get('[data-testid="tess-verdict-planet"]').should('be.visible')
  })
})
