// Stable selector for the rendered Base scene. The Cycle 4 bottom bar no
// longer carries a duplicate HUB control.
export const HOME_HUB_BUTTON = '[data-testid="hub-terrain-fallback"]'
export const INTRO_TITLE = '[data-testid="intro-title"]'

export function assertOnHome(timeout = 10000) {
  return cy.get(HOME_HUB_BUTTON, { timeout }).should('be.visible')
}

/** SSL-450: the launch review shows PREPARE until the vehicle is on the pad; get to a ready LAUNCH button. */
export function readyLaunch(timeout = 15000) {
  cy.get('[data-testid="mission-launch-review"]', { timeout }).should('be.visible')
  cy.get('body').then($body => {
    if ($body.find('[data-testid="prepare-launch-btn"]').length) cy.get('[data-testid="prepare-launch-btn"]').click()
  })
  cy.get('[data-testid="launch-btn"]', { timeout }).should('be.visible').and('not.be.disabled')
}
