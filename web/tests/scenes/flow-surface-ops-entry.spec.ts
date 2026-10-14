import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-575: Surface Ops opens from a beacon in the base scene, not from the dock.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`surface ops entry ${vp}`, () => {
    test.use({ viewport: size })
    test('the base beacon opens Surface Ops', async ({ page }, info) => {
      await stage(page, 'telescope-hub')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const beacon = page.getByTestId('hub-surface-ops')
      await expect(beacon).toBeVisible()
      const box = await beacon.boundingBox()
      expect(box && box.width >= 44 && box.height >= 44).toBe(true)
      await page.screenshot({ path: info.outputPath(`surface-beacon-${vp}.png`) })
      await beacon.click()
      await expect(page.getByTestId("surface-ops-screen")).toBeVisible()
      await expect(page.getByText('Surface Operations', { exact: true })).toHaveCount(0)
      await page.screenshot({ path: info.outputPath(`surface-ops-${vp}.png`) })
    })
  })
}
