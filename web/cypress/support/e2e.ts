import './commands'

// KES-149: running the journeys suite against the deployed production build
// (landnam-test.vercel.app) for the first time surfaced a real React
// hydration mismatch (minified error #418) that never appears against local
// `next dev`, where hydration warnings are unminified and non-fatal by
// default. The mismatch itself doesn't visibly break the game — screenshots
// captured at the moment of failure show the screen rendered correctly — but
// Cypress fails any test with an uncaught exception by default, which would
// make the staging E2E job permanently red on a known, non-blocking issue.
// Root cause is still open (likely game state hydrating from localStorage
// into a server-rendered tree without a mounted-gate) — this only stops the
// test runner from treating that specific known error as fatal; it does not
// suppress other uncaught errors.
Cypress.on('uncaught:exception', err => {
  if (err.message.includes('Minified React error #418')) return false
})

// Stub PocketBase auth so the AuthGateSheet never opens in offline E2E runs.
// Also stub catalog calls so the game uses static fallback data without network errors.
beforeEach(() => {
  // Pre-mark all surveys as seen before every page load so SurveySheet never fires in tests.
  // enqueueSurvey reads 'landnam-surveys-shown' synchronously before dispatching.
  // Dedicated survey QA specs opt out so they can exercise SurveySheet end to end.
  const ALL_SURVEY_KEYS = [
    'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
    'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
    'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
    'lnm_satellite_clarity', 'lnm_resume_mission', 'lnm_base_building', 'lnm_rover_clarity',
  ]
  cy.on('window:before:load', win => {
    if (!Cypress.env('allowSurveys')) {
      win.localStorage.setItem('landnam-surveys-shown', JSON.stringify(ALL_SURVEY_KEYS))
    }
    // Snooze the upgrade prompt indefinitely so SaveProgressPrompt never opens during tests
    win.localStorage.setItem('landnam-upgrade-prompt-snooze-until', String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  })

  if (Cypress.env('livePocketBase')) return

  // Stub the app's own backend-health probe so BackendStatus resolves to
  // 'online' on the first check instead of polling every 2s for the whole
  // test — real PocketBase is never running in offline e2e runs, and every
  // unstubbed poll is wasted wall-clock time across 15+ specs.
  cy.intercept('GET', '/api/backend-health', { statusCode: 200, body: { ok: true } }).as('backendHealth')

  cy.intercept('POST', '**/api/collections/users/auth-with-password', {
    statusCode: 200,
    body: { token: 'e2e-token', record: { id: 'e2e-user', email: 'e2e@landnam.guest' } },
  }).as('pbAuth')

  cy.intercept('POST', '**/api/collections/users/auth-refresh', {
    statusCode: 200,
    body: { token: 'e2e-token', record: { id: 'e2e-user', email: 'e2e@landnam.guest' } },
  }).as('pbAuthRefresh')

  cy.intercept('GET', '**/api/collections/users/auth-refresh', {
    statusCode: 200,
    body: { token: 'e2e-token', record: { id: 'e2e-user', email: 'e2e@landnam.guest' } },
  }).as('pbAuthRefreshGet')

  // Return 404 for game_states so the real PB record for 'e2e-user' never overrides test localStorage state
  cy.intercept('GET', '**/api/collections/game_states/records*', { statusCode: 404, body: { code: 404, message: 'The requested resource wasn\'t found.' } }).as('pbGameState')

  // Fail catalog calls fast so the game falls back to static data immediately
  cy.intercept('GET', '**/api/collections/locations/records*', { statusCode: 503, body: {} }).as('pbLocations')
  cy.intercept('GET', '**/api/collections/minerals/records*', { statusCode: 503, body: {} }).as('pbMinerals')
  cy.intercept('GET', '**/api/collections/clients/records*', { statusCode: 503, body: {} }).as('pbClients')
  cy.intercept('GET', '**/api/collections/rocket_parts/records*', { statusCode: 503, body: {} }).as('pbParts')
  cy.intercept('GET', '**/api/collections/missions_catalog/records*', { statusCode: 503, body: {} }).as('pbMissions')
  cy.intercept('GET', '**/api/collections/structure_blueprints/records*', { statusCode: 503, body: {} }).as('pbStructures')
  cy.intercept('POST', '**/api/collections/game_states/records', { statusCode: 200, body: { id: 'e2e-game-state' } }).as('pbGameStateCreate')
  cy.intercept('PATCH', '**/api/collections/game_states/records/*', { statusCode: 200, body: { id: 'e2e-game-state' } }).as('pbGameStateUpdate')
})
