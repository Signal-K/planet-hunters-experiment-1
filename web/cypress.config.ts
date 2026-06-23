import { defineConfig } from 'cypress'

const profile = process.env.CYPRESS_PROFILE || 'offline'

const profiles: Record<string, Cypress.EndToEndConfigOptions> = {
  offline: {
    baseUrl: 'http://localhost:3000',
    specPattern: [
      'cypress/e2e/smoke.cy.ts',
      'cypress/e2e/game-loop.cy.ts',
      'cypress/e2e/dev-shortcuts.cy.ts',
      'cypress/e2e/m3-territory.cy.ts',
      'cypress/e2e/tutorial-m1.cy.ts',
    ],
    // Portrait canvas: existing tests target the 402px canvas, not the desktop layout.
    // m3-territory.cy.ts overrides viewport per-test where desktop behaviour is needed.
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'tutorial-rail': {
    baseUrl: 'http://localhost:3000',
    specPattern: ['cypress/e2e/tutorial-rail.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'interaction-order': {
    baseUrl: 'http://localhost:3000',
    specPattern: ['cypress/e2e/interaction-order.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'ui-zones': {
    baseUrl: 'http://localhost:3000',
    specPattern: ['cypress/e2e/ui-zones.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'clean-start-loop': {
    baseUrl: 'http://localhost:3000',
    specPattern: ['cypress/e2e/clean-start-loop.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'with-pb': {
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:3000',
    specPattern: ['cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'],
  },
}

const active = profiles[profile] ?? profiles.offline

export default defineConfig({
  e2e: {
    ...active,
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: active.viewportWidth ?? 1280,
    viewportHeight: active.viewportHeight ?? 720,
    video: process.env.CI ? true : false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
  },
})
