import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    specPattern: ['cypress/e2e/pocketbase-auth.cy.ts', 'cypress/e2e/guest-auth.cy.ts'],
    supportFile: false,
    viewportWidth: 390,
    viewportHeight: 844,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    retries: { runMode: 2, openMode: 0 },
  },
})
