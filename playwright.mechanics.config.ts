/**
 * Playwright config for mechanic integration tests.
 *
 * These tests load the real Godot WASM in a headless browser and verify
 * the shell+game integration end-to-end. The WASM can take 10-30s to
 * initialise, so timeouts are much longer than the standard e2e suite.
 *
 * Uses Chromium only — WASM loading is most reliable on Chrome DevTools
 * Protocol and these tests don't need cross-browser coverage.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/mechanics",
  timeout: 90_000,
  // Give each expect() assertion up to 15s (WASM may be slow on first warm-up)
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:3333",
    headless: true,
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Mechanic Integration — Chromium",
      use: {
        ...devices["Desktop Chrome"],
        // WebGL2 flags: Godot 4 WASM requires WebGL2.
        // SwiftShader provides software-rendered WebGL in headless Chrome.
        launchOptions: {
          args: [
            "--enable-webgl",
            "--use-gl=swiftshader",
            "--ignore-gpu-blocklist",
            "--enable-gpu-rasterization",
          ],
        },
      },
    },
  ],
  // Reuse existing dev server if running locally; always start fresh in CI
  webServer: {
    command: "npm run web:dev",
    url: "http://127.0.0.1:3333/",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
