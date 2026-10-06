// SSL-497: one instrument console. Desktop and mobile landscape put the
// viewport in the centre with controls on the left and answers on the right.
// Mobile portrait stacks the viewport, one control strip, and the answer row.

import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'

function visitGalaxyScreen() {
  const tokenPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  const e2eToken = `e30.${tokenPayload}.test`
  cy.intercept('POST', '**/api/collections/users/auth-refresh', {
    statusCode: 200,
    body: { token: e2eToken, record: { id: 'e2e-subject-user', email: 'e2e@example.com' } },
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

  // /game itself always resumes to Earth Base; open the screen's own route.
  cy.visit('/game/galaxy', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(base))
      seedFixtureSession(win, 'e2e-subject-user')
    },
  })
  cy.wait('@subjects')
}

function expectSideLayout() {
  cy.get('[data-testid="instrument-viewport"]').then($viewport => {
    const view = $viewport[0].getBoundingClientRect()
    cy.get('[data-testid="instrument-controls"]').then($controls => {
      expect($controls[0].getBoundingClientRect().right, 'controls sit left of the viewport').to.be.at.most(view.left + 2)
    })
    cy.get('[data-testid="tess-verdict-planet"]').then($answer => {
      expect($answer[0].getBoundingClientRect().left, 'answers sit right of the viewport').to.be.at.least(view.right - 2)
    })
  })
}

describe('TessDiscoveryScreen — shared instrument viewport', () => {
  it('keeps the compact landscape verdict rail in the viewport', () => {
    cy.viewport(844, 390)
    visitGalaxyScreen()
    cy.get('[data-testid="instrument-stage"]', { timeout: 10000 }).should('be.visible')
    expectSideLayout()
    cy.get('[data-testid="tess-verdict-planet"]').then($button => {
      const rect = $button[0].getBoundingClientRect()
      expect(rect.height, 'verdict hit area').to.be.at.least(44)
      expect(rect.top, 'verdict top edge').to.be.at.least(0)
      expect(rect.bottom, 'verdict bottom edge').to.be.at.most(390)
    })
    cy.get('[data-testid="instrument-stage"]').should($stage => {
      expect($stage[0].scrollHeight, 'stage scroll height').to.be.at.most($stage[0].clientHeight + 1)
    })
  })

  it('stacks the viewport, controls and answers on mobile portrait', () => {
    cy.viewport(390, 844)
    visitGalaxyScreen()
    cy.window().its('innerWidth').should('be.lt', 500)
    cy.contains('INSTRUMENT DATA FEED', { timeout: 10000 }).should('be.visible')
    cy.contains('TOI 1000.01').should('be.visible')
    cy.get('[data-testid="instrument-viewport"]').then($viewport => {
      const view = $viewport[0].getBoundingClientRect()
      cy.get('[data-testid="instrument-controls"]').then($controls => {
        expect($controls[0].getBoundingClientRect().top, 'controls sit under the viewport').to.be.at.least(view.bottom - 2)
      })
      cy.get('[data-testid="tess-verdict-planet"]').then($answer => {
        expect($answer[0].getBoundingClientRect().top, 'answers sit under the controls').to.be.at.least($viewport[0].getBoundingClientRect().bottom - 2)
      })
    })
    cy.get('[data-testid="instrument-terminal-toggle"]').should('be.visible')
    cy.get('[data-testid="tess-drag-dip"]').should('exist')
  })

  it('centres the viewport between controls and answers on desktop', () => {
    cy.viewport(1280, 800)
    visitGalaxyScreen()
    cy.contains('INSTRUMENT DATA FEED', { timeout: 10000 }).should('be.visible')
    cy.contains('TOI 1000.01').should('be.visible')
    cy.get('[data-testid="instrument-stage"]').should('be.visible')
    expectSideLayout()
    cy.get('[data-testid="tess-verdict-planet"]').should('be.visible')
    cy.window().then(win => {
      cy.get('[data-testid="instrument-zoom"]').then($el => {
        const el = $el[0] as HTMLInputElement
        const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')?.set
        setter?.call(el, '2.2')
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
    })
    cy.get('[data-testid="instrument-optics"]').should('have.attr', 'data-zoom', '2.2')
  })
})
