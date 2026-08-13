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
    // Survey QA has its own profile, where the explicit runtime opt-in is
    // enabled. Keeping it out of the general feature profile prevents a
    // deliberately disabled survey runtime from being reported as a product
    // failure.
    excludeSpecPattern: ['cypress/e2e/features/surveys.cy.ts'],
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
  // Runs against an already-deployed environment (e.g. the
  // landnam-test.vercel.app staging alias) instead of a locally-started dev
  // server. Scoped to c1-c4-viewport-matrix.cy.ts specifically: it's fast
  // (~25s, no real backend calls beyond initial page load) and, unlike every
  // other journeys spec, was actually confirmed passing against the real
  // production build — a local full-journeys run against staging didn't
  // finish in 10+ minutes (real backend registration/gameplay over the
  // network is far slower and flakier than the mocked local-dev-server
  // runs), so that heavier coverage is 'staging-full' below, not this one.
  staging: {
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:3001',
    specPattern: ['cypress/e2e/journeys/c1-c4-viewport-matrix.cy.ts'],
    viewportWidth: 390,
    viewportHeight: 844,
    env: { livePocketBase: true },
  },
  // Full journeys suite against a live deployment, including
  // clean-start-loop.cy.ts's real registration/playthrough against the
  // actual staging PocketBase backends. Slow and not yet proven reliable
  // end-to-end (see 'staging' above) — run manually via workflow_dispatch,
  // not on every push.
  'staging-full': {
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:3001',
    specPattern: ['cypress/e2e/journeys/**/*.cy.{js,jsx,ts,tsx}'],
    viewportWidth: 390,
    viewportHeight: 844,
    env: { livePocketBase: true },
  },
  // Visual QA profile: headless Chrome, screenshots at every step, video always on.
  // Keep this profile headless: headed launches can open a native crash dialog on
  // macOS and interrupt the operator before Cypress starts.
  // Run with: CYPRESS_PROFILE=visual npx cypress run --browser chrome
  // Use `cypress open` only for deliberate interactive debugging.
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
