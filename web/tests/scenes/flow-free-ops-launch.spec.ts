import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-660: Free Ops has no setup screen of its own. Opening the launch route with no mission picked lands on the Mission Board.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`free ops launch ${vp}`, () => {
    test.use({ viewport: size })
    test('the launch route with no mission hands over to the Mission Board', async ({ page }, info) => {
      await stage(page, 'ui-free-ops-fab')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await expect(page.locator('[data-stage-ready="true"]')).toHaveAttribute('data-stage-screen', 'missions')
      await expect(page.getByTestId('free-ops-build-screen')).toHaveCount(0)
      await page.screenshot({ path: info.outputPath(`free-ops-launch-${vp}.png`) })
    })
  })
}
