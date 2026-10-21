import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-569: a player who launched the telescope reaches the Control Station feeds (rendered proof).
// The legacy merge itself (one old telescope flag unlocks both feeds) is gated in
// lib/game-state.telescope-merge.test.ts; the stage patch bypasses normalizeState, so it cannot prove that.
const LEGACY = [
  { name: 'transit only', patch: { transitSatelliteLaunchedAt: 1760000000000, deepSpaceTelescopeLaunchedAt: null, deepSpaceTelescopeBuilt: false } },
]

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`legacy telescope save ${vp}`, () => {
    test.use({ viewport: size })
    for (const legacy of LEGACY) {
      test(`${legacy.name} opens both feeds`, async ({ page }) => {
        await page.addInitScript(() => { try { localStorage.setItem('ln-help-seen:control-station', '1') } catch { /* private window */ } })
        await stage(page, 'ui-instrument-hub', { patch: legacy.patch })
        expect(await page.evaluate(() => innerWidth)).toBe(size.width)
        await expect(page.getByTestId('instrument-hub-screen')).toBeVisible()
        await expect(page.getByText(/exoplanet hunters/i).first()).toBeVisible()
        await expect(page.getByText(/asteroid discovery/i).first()).toBeVisible()
        await page.screenshot({ path: `/private/tmp/claude-501/shots/legacy-telescope-${vp}.png` })
      })
    }
  })
}
