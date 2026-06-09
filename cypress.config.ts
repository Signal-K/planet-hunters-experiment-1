import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || "http://127.0.0.1:3000",
    specPattern: "web/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "web/cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
