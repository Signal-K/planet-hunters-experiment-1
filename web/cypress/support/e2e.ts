import './commands'
import './screenshot-diff'
import './a11y-checks'
import './responsive-helpers'

// Stub PocketBase auth so the AuthGateSheet never opens in offline E2E runs.
// Also stub catalog calls so the game uses static fallback data without network errors.
beforeEach(() => {
  // Pre-mark all surveys as seen before every page load so SurveySheet never fires in tests.
  // enqueueSurvey reads 'landnam-surveys-shown' synchronously before dispatching.
  // Dedicated survey QA specs opt out so they can exercise SurveySheet end to end.
  const ALL_SURVEY_KEYS = [
    'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
    'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
    'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext',
        'lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext',
    'lnm_satellite_clarity', 'lnm_resume_mission', 'lnm_base_building', 'lnm_rover_clarity',
  ]
  cy.on('window:before:load', win => {
    if (!Cypress.env('allowSurveys')) {
      win.localStorage.setItem('landnam-surveys-shown', JSON.stringify(ALL_SURVEY_KEYS))
    }
    // Keep legacy localStorage fixtures from affecting auth-gate coverage.
    win.localStorage.setItem('landnam-upgrade-prompt-snooze-until', String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  })

  // The Docker release suite runs both real-auth specs and fixture-driven
  // gameplay specs. Only the auth specs should use the live browser auth
  // endpoints; the gameplay fixtures intentionally seed e2e@example.com and
  // need the deterministic browser stubs below. cy.request() calls from the
  // auth specs still reach Docker PocketBase directly because intercepts do
  // not rewrite Cypress's Node-side requests.
  const normalizedSpec = Cypress.spec.relative.replaceAll('\\', '/')
  const isAuthSpec = normalizedSpec.startsWith('auth/') || normalizedSpec.includes('/auth/')
  const realBrowserAuth = Cypress.env('livePocketBase') && isAuthSpec
  if (realBrowserAuth) return

  // Visual QA is intentionally local-only: its screenshots are driven by
  // deterministic localStorage fixtures, not by a successful account login.
  // Returning an auth success here rebinds the fixture from the guest slot to
  // the account slot halfway through a visual flow and can reset the screen
  // to the intro route. Fail these background auth attempts fast instead.
  const visualProfile = Cypress.env('visualProfile') === true

  // Stub the app's own backend-health probe so BackendStatus resolves to
  // 'online' on the first check instead of polling every 2s for the whole
  // test — real PocketBase is never running in offline e2e runs, and every
  // unstubbed poll is wasted wall-clock time across 15+ specs.
  cy.intercept('GET', '/api/backend-health', { statusCode: 200, body: { ok: true } }).as('backendHealth')

  cy.intercept('POST', '**/api/collections/users/auth-with-password', {
    statusCode: 503,
    body: { code: 503, message: visualProfile ? 'Visual QA uses local fixture state.' : 'Fixture E2E uses guest local state.' },
  }).as('pbAuth')

  // The mandatory email gate creates the lightweight account before it
  // authenticates it. Stubbing only auth-with-password leaves the gate
  // permanently mounted in offline journeys (KES-135), so the test never
  // reaches the gameplay flow it is meant to verify.
  cy.intercept('POST', '**/api/collections/users/records', {
    statusCode: 503,
    body: { code: 503, message: visualProfile ? 'Visual QA uses local fixture state.' : 'Fixture E2E uses guest local state.' },
  }).as('pbUserCreate')

  cy.intercept('POST', '**/api/collections/users/auth-refresh', {
    statusCode: 503,
    body: { code: 503, message: visualProfile ? 'Visual QA uses local fixture state.' : 'Fixture E2E uses guest local state.' },
  }).as('pbAuthRefresh')

  cy.intercept('GET', '**/api/collections/users/auth-refresh', {
    statusCode: 503,
    body: { code: 503, message: visualProfile ? 'Visual QA uses local fixture state.' : 'Fixture E2E uses guest local state.' },
  }).as('pbAuthRefreshGet')

  // Fixture journeys deliberately remain guests. Their localStorage state is
  // seeded in the unscoped guest slot; returning a fake authenticated record
  // here would switch the app to the account-scoped slot and discard it.
  cy.intercept('POST', '**/api/landnam-auth/exchange', {
    statusCode: 503,
    body: { code: 503, message: visualProfile ? 'Visual QA uses local fixture state.' : 'Fixture E2E uses guest local state.' },
  }).as('pbLandnamExchange')

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
