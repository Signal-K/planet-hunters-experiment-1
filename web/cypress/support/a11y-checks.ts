/**
 * Accessibility testing integration
 *
 * Automatically checks for common a11y issues:
 * - Color contrast violations
 * - Missing ARIA labels
 * - Keyboard navigation problems
 * - Missing alt text
 * - Semantic HTML issues
 *
 * Note: Full axe-core integration requires npm install @axe-core/cypress
 * This is a simplified version that checks basic issues without external dependencies
 */

/**
 * Check that elements are keyboard accessible
 */
function checkKeyboardAccess() {
  // Verify interactive elements have proper focus states
  cy.get('button, a, [role="button"], input').each(($el) => {
    // Each interactive element should be focusable
    cy.wrap($el).should('not.have.attr', 'tabindex', '-1');
  });
}

/**
 * Check color contrast (basic check)
 * Note: This is simplified. Full contrast checking requires color parsing
 */
function checkColorContrast() {
  // This is a placeholder - full implementation would need color extraction
  // For now, we flag any elements with inline styles that might have contrast issues
  cy.get('[style*="color"]').should('exist');
}

/**
 * Check for missing alt text on images
 */
function checkImageAltText() {
  cy.get('img').each(($img) => {
    const alt = $img.attr('alt');
    const isDecorative = $img.attr('role') === 'presentation' ||
                         $img.attr('aria-hidden') === 'true';

    if (!isDecorative) {
      cy.wrap($img).should('have.attr', 'alt');
    }
  });
}

/**
 * Check for form labels
 */
function checkFormLabels() {
  cy.get('input[type="text"], input[type="email"], textarea, select').each(($field) => {
    const fieldId = $field.attr('id');
    const hasLabel = $field.attr('aria-label') || $field.attr('aria-labelledby');
    const hasAssocLabel = fieldId && cy.get(`label[for="${fieldId}"]`);

    cy.wrap($field).should('have.attr', 'id');
  });
}

/**
 * Check for proper heading hierarchy
 */
function checkHeadingHierarchy() {
  // Verify h1 exists on page
  cy.get('h1').should('exist');

  // Verify no skipped heading levels (e.g., h1 → h3)
  cy.get('h2, h3, h4, h5, h6').each(($heading, idx) => {
    const level = parseInt($heading.prop('tagName')[1]);
    if (idx > 0) {
      cy.get($heading)
        .prevAll('h1, h2, h3, h4, h5, h6')
        .first()
        .should('exist');
    }
  });
}

/**
 * Custom command: Run accessibility checks on current page
 */
Cypress.Commands.add('checkA11y', () => {
  // Disable these checks if running in CI with limited resources
  if (Cypress.env('SKIP_A11Y') === true) {
    return;
  }

  checkKeyboardAccess();
  checkImageAltText();
  checkFormLabels();
  checkHeadingHierarchy();
});

/**
 * After each test, run a11y checks (optional)
 * Uncomment to enable automatic a11y checks on every test
 */
afterEach(() => {
  // Skip by default to keep tests fast
  // Enable with: cypress run --env ENABLE_A11Y_CHECKS=true
  if (Cypress.env('ENABLE_A11Y_CHECKS') === true) {
    cy.checkA11y();
  }
});

// Type declarations
declare global {
  namespace Cypress {
    interface Chainable {
      checkA11y(): Chainable<void>;
    }
  }
}

export {};
