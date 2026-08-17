module.exports = {
  e2e: {
    // docker-compose.e2e.yml names the Next service `next-app`; the prior
    // `web` hostname made the supposedly self-contained PB suite unusable.
    baseUrl: process.env.CYPRESS_baseUrl || 'http://next-app:3001',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    videosFolder: '/tmp/cypress/videos',
    screenshotsFolder: '/tmp/cypress/screenshots',
    screenshotOnRunFailure: true,
    reporter: 'json',
    reporterOptions: {
      output: '/tmp/cypress/results/cypress.json',
    },
  },
}
