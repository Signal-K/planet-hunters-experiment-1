import { defineConfig } from 'cypress'

const profile = process.env.CYPRESS_PROFILE || 'offline'

// Device/viewport matrix (KES-112): every profile below still defaults to the
// mobile-portrait dimensions it always ran at. Set CYPRESS_VIEWPORT to run the
// same spec set against a different breakpoint without duplicating specs —
// e.g. `CYPRESS_VIEWPORT=desktop npm run cypress:run:regression`.
const VIEWPORTS: Record<string, { viewportWidth: number; viewportHeight: number }> = {
  mobile: { viewportWidth: 390, viewportHeight: 844 },
  tablet: { viewportWidth: 834, viewportHeight: 1194 },
  desktop: { viewportWidth: 1440, viewportHeight: 900 },
  landscape: { viewportWidth: 926, viewportHeight: 428 },
}
const viewportKey = process.env.CYPRESS_VIEWPORT || 'mobile'
const viewportOverride = VIEWPORTS[viewportKey]
if (!viewportOverride) {
  throw new Error(
    `Unknown CYPRESS_VIEWPORT "${viewportKey}" — expected one of: ${Object.keys(VIEWPORTS).join(', ')}`,
  )
}

const profiles: Record<string, Cypress.EndToEndConfigOptions> = {
  offline: {
    baseUrl: 'http://localhost:3001',
    specPattern: [
      'cypress/e2e/smoke/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/e2e/regression/bug-hunt.cy.ts',
      'cypress/e2e/regression/game-state-save-race.cy.ts',
    ],
    // Portrait canvas: existing tests target the 402px canvas, not the desktop layout.
    // m3-territory.cy.ts overrides viewport per-test where desktop behaviour is needed.
    viewportWidth: 390,
    viewportHeight: 844,
  },
  regression: {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/regression/**/*.cy.{js,jsx,ts,tsx}'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  journeys: {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/journeys/**/*.cy.{js,jsx,ts,tsx}'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  features: {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/features/**/*.cy.{js,jsx,ts,tsx}'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  auth: {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/auth/**/*.cy.{js,jsx,ts,tsx}'],
    viewportWidth: 390,
    viewportHeight: 844,
    env: { livePocketBase: true },
  },
  full: {
    baseUrl: 'http://localhost:3001',
    specPattern: [
      'cypress/e2e/smoke/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/e2e/regression/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/e2e/features/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/e2e/journeys/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/e2e/auth/**/*.cy.{js,jsx,ts,tsx}',
    ],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'tutorial-rail': {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/features/tutorial-rail.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'interaction-order': {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/features/interaction-order.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'ui-zones': {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/features/ui-zones.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  'clean-start-loop': {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/journeys/clean-start-loop.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
  surveys: {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/features/surveys.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
    env: { allowSurveys: true },
  },
  'with-pb': {
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:3001',
    specPattern: ['cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'],
    env: { livePocketBase: true },
  },
  // Visual QA profile: headed Chrome, screenshots at every step, video always on.
  // Run with: CYPRESS_PROFILE=visual npx cypress run --browser chrome --headed
  // Or open interactively: CYPRESS_PROFILE=visual npx cypress open --browser chrome
  visual: {
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:3099',
    specPattern: ['cypress/e2e/visual/**/*.cy.{js,jsx,ts,tsx}'],
    viewportWidth: 390,
    viewportHeight: 844,
  },
}

const active = profiles[profile] ?? profiles.offline

export default defineConfig({
  e2e: {
    ...active,
    supportFile: 'cypress/support/e2e.ts',
    // CYPRESS_VIEWPORT always wins over the profile's own dimensions — every
    // profile's viewportWidth/viewportHeight above is just its "mobile" default.
    viewportWidth: viewportOverride.viewportWidth,
    viewportHeight: viewportOverride.viewportHeight,
    // Always record video for visual profile; otherwise only in CI
    video: profile === 'visual' ? true : (process.env.CI ? true : false),
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    // A failing spec re-runs `retries.runMode` times before being reported —
    // every extra retry multiplies that spec's full timeout budget. 2 retries
    // (3 attempts) on a genuinely broken spec can add tens of minutes to a
    // local run. CI keeps 2 to absorb real flake; local/agent runs fail fast.
    retries: {
      runMode: process.env.CI ? 2 : 1,
      openMode: 0,
    },
  },
})
