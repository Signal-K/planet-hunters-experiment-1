import { test } from '@playwright/test'
import { VIEWPORTS } from './helpers'
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    test(`launch ${vp}`, async ({ page }) => {
      await page.goto('/zz-launch')
      await page.waitForTimeout(2000)
      await page.screenshot({ path: `/tmp/lfl/launch-${vp}.png` })
    })
  })
}
