import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// Hugo's Orionids playtest: the Control Station data analysis had no explanation.
// The help sheet now opens once on the first visit and stays closed afterwards.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`control station first-visit help ${vp}`, () => {
    test.use({ viewport: size })
    test('opens once, then only on the "?"', async ({ page }, info) => {
      await stage(page, 'ui-instrument-hub')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await expect(page.getByTestId('help-sheet')).toBeVisible()
      await expect(page.getByText('What the data analysis is')).toBeVisible()
      await page.screenshot({ path: info.outputPath(`help-first-visit-${vp}.png`) })
      await page.getByTestId('help-close').click()
      await page.reload()
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId('instrument-hub-screen')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('help-sheet')).toHaveCount(0)
    })
  })
}
