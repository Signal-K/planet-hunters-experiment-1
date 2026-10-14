import { expect, test } from '@playwright/test'
import { VIEWPORTS, expectSound, stage } from './helpers'

// Mission creation is one base scene with three steps: target map, rocket and cargo, review and launch.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`mission plan steps ${vp}`, () => {
    test.use({ viewport: size })
    test('walks target map, rocket and cargo, then review', async ({ page }, info) => {
      const { errors } = await stage(page, 'ui-target-picker', { patch: { francs: 500_000_000 } })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const plan = page.getByTestId('mission-launch-review')
      await expect(plan).toHaveAttribute('data-step', 'target')
      await expect(page.getByTestId('launch-review-map')).toBeVisible()
      await expect(page.getByTestId('launch-rocket')).toHaveCount(0)
      await page.screenshot({ path: info.outputPath(`step1-target-${vp}.png`) })
      await page.getByTestId('plan-next').click()
      await expect(plan).toHaveAttribute('data-step', 'vehicle')
      await expect(page.getByTestId('launch-rocket')).toBeVisible()
      await page.waitForTimeout(1800)
      await page.screenshot({ path: info.outputPath(`step2-vehicle-${vp}.png`) })
      await page.getByTestId('plan-next').click()
      await expect(plan).toHaveAttribute('data-step', 'review')
      await expect(page.getByTestId('prepare-launch-btn')).toBeVisible()
      await page.screenshot({ path: info.outputPath(`step3-review-${vp}.png`) })
      await expectSound(page, errors)
    })
  })
}
