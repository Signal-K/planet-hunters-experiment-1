/**
 * Responsive Layout Matrix
 * Tests critical screens across mobile/tablet/desktop to catch layout breakage
 *
 * These tests verify that core UI elements remain visible and properly laid out
 * across all viewport sizes, catching responsive design issues that unit tests miss.
 */

import { VIEWPORTS, setupGameState, BASE_RESPONSIVE_STATE } from '../../support/responsive-helpers';

const STORAGE_KEY = 'landnam-game-state-v1';

describe('Responsive Layout — Critical Screens Matrix', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/**', { statusCode: 500 }).as('blockBackend');
  });

  describe('Hub Screen', () => {
    Object.entries(VIEWPORTS).forEach(([_vpKey, vp]) => {
      it(`Hub renders properly at ${vp.name} (${vp.width}×${vp.height})`, () => {
        cy.viewport(vp.width, vp.height);
        setupGameState(BASE_RESPONSIVE_STATE);

        // Main layout should be visible
        cy.get('[data-testid="hub-terrain-fallback"]').should('exist');
        cy.get('[data-testid="launchpad-scene-object"]').should('exist');

        // Navigation must be visible and accessible
        if (vp.width >= 1024) {
          // Desktop: sidebar nav
          cy.get('[data-testid="sidebar-nav-launchpad"]').should('be.visible');
          cy.get('[data-testid="sidebar-nav-missions"]').should('be.visible');
          cy.get('[data-testid="sidebar-nav-market"]').should('be.visible');
        } else {
          // Mobile: bottom tab bar
          cy.get('[data-testid="bottom-tab-launchpad"]').should('be.visible');
          cy.get('[data-testid="bottom-tab-missions"]').should('be.visible');
          cy.get('[data-testid="bottom-tab-market"]').should('be.visible');
        }

        // Buttons should not be clipped or misaligned
        cy.get('[data-testid="hub-quick-action"]', { timeout: 5000 })
          .should('be.visible')
          .invoke('width').should('be.gt', 0);

        cy.screenshot(`hub-${vp.name}`);
      });
    });
  });

  describe('Market Screen', () => {
    Object.entries(VIEWPORTS).forEach(([_vpKey, vp]) => {
      it(`Market renders properly at ${vp.name} (${vp.width}×${vp.height})`, () => {
        cy.viewport(vp.width, vp.height);
        setupGameState({
          ...BASE_RESPONSIVE_STATE,
          screen: 'market',
          player: {
            ...BASE_RESPONSIVE_STATE.player,
            stash: { iron: 500, ice: 250, regolith: 100 },
          },
        });

        // Market UI must be visible
        cy.contains('Commodity Exchange', { timeout: 5000 }).should('be.visible');
        cy.get('[data-testid="market-commodity-grid"]', { timeout: 5000 }).should('be.visible');

        // Commodity items must not overflow or wrap awkwardly
        cy.get('[data-testid="market-commodity-grid"] [data-testid^="commodity-"]')
          .should('have.length.greaterThan', 0)
          .each($item => {
            cy.wrap($item).should('be.visible');
          });

        // Sell buttons must be accessible
        cy.get('[data-testid="sell-all-btn"]', { timeout: 5000 })
          .first()
          .should('be.visible')
          .invoke('height').should('be.gt', 0);

        // Back button visible and functional area available
        cy.get('[data-testid="market-back-btn"]').should('be.visible');

        cy.screenshot(`market-${vp.name}`);
      });
    });
  });

  describe('Mining Screen', () => {
    Object.entries(VIEWPORTS).forEach(([_vpKey, vp]) => {
      it(`Mining HUD renders properly at ${vp.name} (${vp.width}×${vp.height})`, () => {
        cy.viewport(vp.width, vp.height);
        setupGameState({
          ...BASE_RESPONSIVE_STATE,
          screen: 'mining',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'eros',
          player: {
            ...BASE_RESPONSIVE_STATE.player,
            activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Bulk Iron Run → Eros' },
            missionsDone: 0,
          },
        });

        // Canvas must render
        cy.get('[data-testid="mining-canvas"]', { timeout: 20000 })
          .should('be.visible')
          .invoke('width').should('be.gt', 0)
          .invoke('height').should('be.gt', 0);

        // Mining HUD controls must be visible and accessible
        cy.get('[data-testid="fire-laser-btn"]', { timeout: 5000 }).should('be.visible');
        cy.get('[data-testid="mining-timer"]').should('be.visible');

        // Control buttons should not overlap or be clipped
        cy.get('[data-testid="mining-controls"]').should('be.visible');
        cy.get('[data-testid="mining-controls"] button')
          .each($btn => {
            cy.wrap($btn).invoke('width').should('be.gt', 0);
            cy.wrap($btn).invoke('height').should('be.gt', 0);
          });

        // Guide/help button visible on all sizes
        cy.get('[data-testid="mining-guide-btn"]').should('be.visible');

        cy.screenshot(`mining-${vp.name}`);
      });
    });
  });

  describe('Navigation Consistency', () => {
    it('can navigate between screens at all viewports', () => {
      Object.entries(VIEWPORTS).forEach(([_vpKey, vp]) => {
        cy.viewport(vp.width, vp.height);
        setupGameState(BASE_RESPONSIVE_STATE);

        // From Hub → Market
        if (vp.width >= 1024) {
          cy.get('[data-testid="sidebar-nav-market"]').click();
        } else {
          cy.get('[data-testid="bottom-tab-market"]').click();
        }

        cy.contains('Commodity Exchange', { timeout: 5000 }).should('be.visible');

        // Back to Hub
        cy.get('[data-testid="market-back-btn"]').click();
        cy.get('[data-testid="hub-terrain-fallback"]', { timeout: 5000 }).should('exist');
      });
    });
  });
});
