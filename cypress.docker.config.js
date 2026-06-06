module.exports = {
  e2e: {
    baseUrl: 'http://web:3000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
    video: false,
    screenshotOnRunFailure: true,
  },
}
