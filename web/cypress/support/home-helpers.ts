// Stable selector for the rendered Base scene. The Cycle 4 bottom bar no
// longer carries a duplicate HUB control.
export const HOME_HUB_BUTTON = '[data-testid="hub-terrain-fallback"]'
export const INTRO_TITLE = '[data-testid="intro-title"]'

export function assertOnHome(timeout = 10000) {
  return cy.get(HOME_HUB_BUTTON, { timeout }).should('be.visible')
}
