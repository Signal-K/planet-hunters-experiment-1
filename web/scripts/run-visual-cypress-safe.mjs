import { execFileSync, spawnSync } from 'node:child_process'

function macOSMajorVersion() {
  if (process.platform !== 'darwin') return null
  const version = execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim()
  return Number.parseInt(version.split('.')[0], 10)
}

const macMajor = macOSMajorVersion()
if (!process.env.CI && macMajor !== null && macMajor >= 26) {
  console.error(
    `Cypress visual run blocked safely: Cypress Electron aborts during startup on macOS ${macMajor}. ` +
      'Run this profile in CI or on a supported macOS version; no Cypress process was started.',
  )
  process.exit(2)
}

const result = spawnSync(
  'npx',
  ['cypress', 'run', '--browser', 'chrome'],
  {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: undefined,
      CYPRESS_PROFILE: 'visual',
    },
    stdio: 'inherit',
  },
)

process.exit(result.status ?? 1)
