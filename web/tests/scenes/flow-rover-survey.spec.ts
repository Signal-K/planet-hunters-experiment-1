import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// Takeon's own isometric field. A scanner sweep logs a formation, then the ship laser unlocks.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    test('scanning a formation enables continue to the ship laser', async ({ page }, info) => {
      test.setTimeout(150_000)
      const { errors } = await stage(page, 'ui-rover-survey')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const cont = page.getByTestId('rover-continue-to-laser')
      await expect(cont).toBeDisabled()
      await expect(page.locator('[data-testid="rover-survey-screen"] canvas')).toBeVisible()
      await expect(page.locator('[data-testid^="rover-outcrop-"]')).toHaveCount(0)
      const scan = page.getByTestId('rover-scan')
      await expect(scan).toBeEnabled({ timeout: 20_000 })
      await scan.click()
      await expect(page.getByTestId('rover-survey-readout')).toContainText('OBSERVATION LOGGED')
      await expect(cont).toBeEnabled()
      await page.screenshot({ path: info.outputPath(`rover-survey-${vp}.png`) })
      expect(errors).toEqual([])
    })
  })
}
