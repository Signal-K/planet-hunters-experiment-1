import './commands'

// Stub PocketBase auth so the AuthGateSheet never opens in offline E2E runs.
// Also stub catalog calls so the game uses static fallback data without network errors.
beforeEach(() => {
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
  cy.intercept('GET', '**/api/collections/contractors/records*', { statusCode: 503, body: {} }).as('pbContractors')
  cy.intercept('GET', '**/api/collections/rocket_parts/records*', { statusCode: 503, body: {} }).as('pbParts')
  cy.intercept('GET', '**/api/collections/missions_catalog/records*', { statusCode: 503, body: {} }).as('pbMissions')
  cy.intercept('GET', '**/api/collections/structure_blueprints/records*', { statusCode: 503, body: {} }).as('pbStructures')
  cy.intercept('POST', '**/api/collections/game_states/records', { statusCode: 200, body: { id: 'e2e-game-state' } }).as('pbGameStateCreate')
  cy.intercept('PATCH', '**/api/collections/game_states/records/*', { statusCode: 200, body: { id: 'e2e-game-state' } }).as('pbGameStateUpdate')


  // Pre-mark all surveys as seen before every page load so SurveySheet never fires in tests.
  // enqueueSurvey reads 'landnam-surveys-shown' synchronously before dispatching.
  const ALL_SURVEY_KEYS = [
    'lnm_first_launch', 'lnm_mining_feel', 'lnm_contractor_pick',
    'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
    'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
  ]
  cy.on('window:before:load', win => {
    win.localStorage.setItem('landnam-surveys-shown', JSON.stringify(ALL_SURVEY_KEYS))
    // Snooze the upgrade prompt indefinitely so SaveProgressPrompt never opens during tests
    win.localStorage.setItem('landnam-upgrade-prompt-snooze-until', String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  })
})
