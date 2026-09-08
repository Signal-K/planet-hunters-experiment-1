/**
 * Screenshot diff helpers for visual regression testing
 *
 * Simple screenshot comparison that:
 * 1. Captures screenshots during tests
 * 2. Can be compared to baseline in CI
 * 3. Flags visual regressions
 *
 * Usage:
 *   cy.visitAndScreenshot('/game/hub', 'hub-baseline')
 *   cy.screenshot('feature-name')
 *
 * In CI: Compare snapshots to detect visual drift
 */

/**
 * Visit a URL and capture a baseline screenshot
 */
Cypress.Commands.add('visitAndScreenshot', (url: string, name: string) => {
  cy.visit(url);
  cy.screenshot(name, { capture: 'fullPage', timeout: 10000 });
});

/**
 * Wait for element to render, then screenshot
 */
Cypress.Commands.add('waitAndScreenshot', (selector: string, name: string) => {
  cy.get(selector, { timeout: 10000 }).should('be.visible');
  cy.screenshot(name, { capture: 'viewport' });
});

/**
 * Screenshot at multiple viewports
 */
Cypress.Commands.add('screenshotAllViewports', (name: string) => {
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  viewports.forEach(vp => {
    cy.viewport(vp.width, vp.height);
    cy.screenshot(`${name}-${vp.name}`, { capture: 'viewport' });
  });
});

// Type declarations for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      visitAndScreenshot(url: string, name: string): Chainable<void>;
      waitAndScreenshot(selector: string, name: string): Chainable<void>;
      screenshotAllViewports(name: string): Chainable<void>;
    }
  }
}

export {};
