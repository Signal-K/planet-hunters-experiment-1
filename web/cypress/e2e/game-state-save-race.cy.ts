// Regression test for a real prod 400 seen on POST .../game_states/records.
//
// Root cause: two near-simultaneous first-saves for the same brand-new user
// (e.g. two tabs/devices opening the game at once) both attempt create(),
// and the loser gets PocketBase's real unique-constraint rejection shape
// (validation_not_unique). The old recovery path looked the record up with
// getFirstListItem(`user = "..."`), which has its own read-after-write race
// window against the just-committed winner record. useAuthSync.saveRemoteState
// now creates with an explicit, deterministic id (== userId), so the loser
// can recover with a direct update(userId, ...) — no lookup, no race window.

describe('game_states save race recovery', () => {
  it('recovers via a direct update(userId, ...) when create loses the unique-constraint race, without any lookup request', () => {
    cy.intercept('POST', '**/api/collections/game_states/records', {
      statusCode: 400,
      body: {
        data: { user: { code: 'validation_not_unique', message: 'Value must be unique.' } },
        message: 'Failed to create record.',
        status: 400,
      },
    }).as('pbGameStateCreateConflict')

    cy.intercept('PATCH', '**/api/collections/game_states/records/e2e-user', {
      statusCode: 200,
      body: { id: 'e2e-user' },
    }).as('pbGameStateRecoveryUpdate')

    // preset/preview mode skips backend persistence entirely (see
    // GameProvider's isPreview gate), so this must be a plain, non-preview
    // visit for the persist effect to ever run.
    cy.visit('/game')
    cy.contains('BEGIN OPERATIONS', { timeout: 15000 }).should('be.visible')

    cy.wait('@pbGameStateCreateConflict', { timeout: 20000 })
    cy.wait('@pbGameStateRecoveryUpdate', { timeout: 20000 })
  })
})
