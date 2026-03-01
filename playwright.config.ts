import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3333",
    headless: true,
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run web:dev",
    url: "http://127.0.0.1:3333/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
