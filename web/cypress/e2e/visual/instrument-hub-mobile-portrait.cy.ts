const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
const TUTORIAL_ACK_KEY = 'ln_tutorial_complete_ack'
const FAR_FUTURE = String(Date.now() + 365 * 24 * 60 * 60 * 1000)

function interceptFeeds() {
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
  })
  cy.intercept('GET', '**/api/collections/asteroid_candidates/records*', {
    statusCode: 200,
    body: {
      page: 1,
      perPage: 500,
      totalItems: 1,
      totalPages: 1,
      items: [{
        id: 'neo-1',
        tempDesig: 'K26A01',
        score: 88,
        discoveryDate: '2026-09-01',
        ra: 12.5,
        decl: -4.2,
        vMag: 20.1,
        hMag: 24.3,
        nObs: 6,
        arcDays: 0.4,
        lastSeenDays: 0.2,
        resolved: false,
      }],
    },
  })
}

describe('instrument hub mobile portrait layout', () => {
  it('captures the live-base viewport and tall classify workspace', () => {
    interceptFeeds()
    cy.viewport(390, 844)
    cy.visit('/game/instrument-hub?preset=ui-instrument-hub', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem(SNOOZE_KEY, FAR_FUTURE)
        win.localStorage.setItem(SURVEY_KEY, JSON.stringify([]))
        win.localStorage.setItem(TUTORIAL_ACK_KEY, '1')
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen: 'instrument-hub' }))
      },
    })
    cy.get('[data-testid="instrument-hub-screen"]', { timeout: 20_000 }).should('be.visible')
    cy.get('[data-testid="instrument-hub-earth-viewport"]', { timeout: 20_000 }).should('be.visible')
    cy.get('[data-testid="hub-terrain-fallback"]', { timeout: 20_000 }).should('be.visible')
    cy.get('[data-testid="instrument-hub-classify-screen"]', { timeout: 20_000 }).should('be.visible')
    cy.get('[data-testid="instrument-control-filter"]').should('be.visible')
    cy.screenshot('instrument-hub-mobile-portrait', { capture: 'viewport' })
  })
})
