import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-616: a picked contract shows the Contract / Plan / Launch rail and Destination, Vehicle, Cargo slots with in-place Change sheets.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`mission plan strip ${vp}`, () => {
    test.use({ viewport: size })
    test('shows the plan and opens the change sheets', async ({ page }, info) => {
      await stage(page, 'ui-target-picker', { patch: { francs: 500_000_000 } })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await expect(page.getByTestId('mission-plan-strip')).toBeVisible()
      await expect(page.getByTestId('plan-cargo')).toBeVisible()
      await page.screenshot({ path: info.outputPath(`plan-${vp}.png`) })
      await page.getByTestId('plan-destination').click()
      await expect(page.getByTestId('plan-sheet-destination')).toBeVisible()
      await page.screenshot({ path: info.outputPath(`plan-destination-${vp}.png`) })
      await page.getByTestId('plan-sheet-destination').getByRole('button', { name: 'Close' }).click()
      await page.getByTestId('plan-vehicle').click()
      await expect(page.getByTestId('plan-sheet-vehicle')).toBeVisible()
      await page.screenshot({ path: info.outputPath(`plan-vehicle-${vp}.png`) })
    })
  })
}
