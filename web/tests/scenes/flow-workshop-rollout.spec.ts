import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-375: the rocket stands in the Workshop while it is prepared and rolls to the pad in-scene on confirm,
// all inside the two-sheet setup (contract, launch review) with no extra sheet.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`workshop rollout ${vp}`, () => {
    test.use({ viewport: size })
    test('rocket starts in the Workshop and rolls to the pad on build', async ({ page }, info) => {
      await stage(page, 'ui-target-picker', { patch: { francs: 500_000_000 } })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const art = page.getByTestId('launch-art')
      await expect(art).toHaveAttribute('data-stage', 'workshop')
      const rocket = page.getByTestId('launch-rocket')
      const startX = (await rocket.boundingBox())!.x
      await page.screenshot({ path: info.outputPath(`workshop-${vp}.png`) })
      await page.getByTestId('prepare-launch-btn').click()
      await expect(art).toHaveAttribute('data-stage', 'pad')
      await page.waitForTimeout(700)
      await page.screenshot({ path: info.outputPath(`rolling-${vp}.png`) })
      await expect(page.getByTestId('launch-btn')).toBeVisible({ timeout: 6000 })
      await page.waitForTimeout(1700)
      const endX = (await rocket.boundingBox())!.x
      expect(endX).toBeGreaterThan(startX + 20)
      await page.screenshot({ path: info.outputPath(`pad-${vp}.png`) })
    })
  })
}
