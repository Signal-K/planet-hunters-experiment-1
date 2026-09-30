// Stable selectors for the Home chrome (SSL-372). Home no longer renders an
// "Earth Base" h1, so specs assert on the shared chrome bar instead.
export const HOME_HUB_BUTTON = '[data-testid="home-bar-hub"]'
export const INTRO_TITLE = '[data-testid="intro-title"]'

export function assertOnHome(timeout = 10000) {
  return cy.get(HOME_HUB_BUTTON, { timeout }).should('be.visible')
}
