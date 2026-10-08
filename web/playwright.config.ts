import { defineConfig } from '@playwright/test'

// Scene checks: every test mounts ONE screen from fixture state via /game/stage.
// No sign-in, no loop, no backend. Locally: `npm run test:scenes`.
// SCENES_CHANNEL=chrome uses the installed Chrome instead of the downloaded Chromium.
const port = process.env.PORT ?? '3001'
export default defineConfig({
  testDir: './tests',
  outputDir: './tests/.out',
  fullyParallel: true,
  workers: 2,
  // Real layout failures are deterministic and fail every attempt. Retries only absorb the browser process
  // dying under heavy machine load ("Target page, context or browser has been closed"); retried passes are
  // reported as "flaky" so they stay visible.
  retries: 2,
  timeout: 45_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'tests/.report' }]] : 'list',
  use: {
    baseURL: process.env.SCENES_BASE_URL ?? `http://localhost:${port}`,
    channel: process.env.SCENES_CHANNEL || undefined,
    launchOptions: { args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: process.env.SCENES_BASE_URL ? undefined : {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}/game/stage`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { NEXT_PUBLIC_LANDNAM_ENV: 'staging' },
  },
})
