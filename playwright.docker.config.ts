/**
 * Docker-specific Playwright config.
 * Uses Firefox only — Chrome/WebKit crash under QEMU x86_64 emulation on Apple Silicon.
 * GitHub Actions uses playwright.config.ts (native x86_64, all browsers).
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3333",
    headless: true,
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Firefox Desktop",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      // Firefox doesn't support isMobile — simulate mobile via viewport only
      name: "Firefox Mobile",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 844, height: 390 },
      },
    },
  ],
  webServer: {
    command: "npm run web:dev",
    url: "http://127.0.0.1:3333/",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
