module.exports = {
  e2e: {
    // docker-compose.e2e.yml names the Next service `next-app`; the prior
    // `web` hostname made the supposedly self-contained PB suite unusable.
    baseUrl: process.env.CYPRESS_baseUrl || 'http://next-app:3001',
    // The Docker release suite exercises the real isolated PocketBases. This
    // flag prevents the shared Cypress support setup from replacing those
    // calls with the offline e2e-user fixtures.
    env: { livePocketBase: true },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    // M3 is not an active product scope yet, and survey QA has a dedicated
    // runtime opt-in run below. Keep the release report honest about the
    // shipped M1/M2 plus post-onboarding surface under test.
    excludeSpecPattern: [
      'cypress/e2e/features/m3-territory.cy.ts',
      'cypress/e2e/features/surveys.cy.ts',
    ],
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    videosFolder: '/tmp/cypress/videos',
    screenshotsFolder: '/tmp/cypress/screenshots',
    screenshotOnRunFailure: true,
    // Mocha's built-in JSON reporter writes to stdout. The compose command
    // captures that stream into the mounted results directory so a report is
    // still available when Cypress exits non-zero.
    reporter: 'json',
  },
}
