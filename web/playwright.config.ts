import { chromium, defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// Scene checks: every test mounts ONE screen from fixture state via /game/stage.
// No sign-in, no loop, no backend. Locally: `npm run test:scenes`.
// SCENES_CHANNEL=chrome uses the installed Chrome instead of the downloaded Chromium.
const port = process.env.PORT ?? '3001'
const localChrome = !process.env.CI && !existsSync(chromium.executablePath())
  && existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const channel = process.env.SCENES_CHANNEL || (localChrome ? 'chrome' : undefined)
export default defineConfig({
  testDir: process.env.STAGING_PLAYTHROUGH ? './tests/staging' : './tests/scenes',
  outputDir: './tests/.out',
  fullyParallel: true,
  workers: 2,
  // Fail deterministic local failures once; keep CI retries for transient worker failures.
  retries: process.env.CI ? 2 : 0,
  timeout: 45_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'tests/.report' }], ['json', { outputFile: 'tests/.out/results.json' }]] : 'list',
  use: {
    baseURL: process.env.SCENES_BASE_URL ?? `http://localhost:${port}`,
    channel,
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
