import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-611: the Control Station is a real building on the base. It stands on its own site beside a narrower launchpad and hangar, and tapping it opens the telescope and satellite feeds.
const FULL = { placed: ['launchpad', 'market', 'control-station', 'surface-silo'], placementPlots: { launchpad: 0, market: 1, 'surface-silo': 2, 'control-station': 3 } }

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`control station ${vp}`, () => {
    test.use({ viewport: size })

    test('stands on the base and opens the feeds when tapped', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true, patch: FULL })
      await expect(page.getByTestId('building-control-station')).toBeVisible()
      await expect(page.locator('[data-pixel-structure="control-station"]')).toBeVisible()
      await page.screenshot({ path: `tests/.out/control-station-${vp}.png` })
      await page.getByTestId('building-control-station-hit').dispatchEvent('click')
      await expect(page.locator('[data-stage-screen]')).toHaveAttribute('data-stage-screen', 'instrument-hub')
      expect(errors).toEqual([])
    })

    test('the Menu offers the Control station only once it is built', async ({ page }) => {
      await stage(page, 'm1-hub', { chrome: true })
      await page.getByTestId('hub-menu-btn').dispatchEvent('click')
      await expect(page.getByTestId('base-menu-control-station')).toHaveCount(0)
      await page.goto('about:blank')
      await stage(page, 'm1-hub', { chrome: true, patch: FULL })
      await page.getByTestId('hub-menu-btn').dispatchEvent('click')
      await expect(page.getByTestId('base-menu-control-station')).toBeVisible()
    })
  })
}
