import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'https://staging.playlandnam.space',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    screenshotOnRunFailure: true,
    video: false,
    defaultCommandTimeout: 15_000,
  },
})
