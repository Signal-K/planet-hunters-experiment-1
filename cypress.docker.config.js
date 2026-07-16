module.exports = {
  e2e: {
    baseUrl: 'http://web:3001',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    videosFolder: '/tmp/cypress/videos',
    screenshotsFolder: '/tmp/cypress/screenshots',
    screenshotOnRunFailure: true,
  },
}
