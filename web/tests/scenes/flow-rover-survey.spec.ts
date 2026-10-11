import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// Starter-rover survey: log one exposed outcrop, then continue to the ship laser. The rover does not extract cargo.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    test('logging an outcrop enables continue to the ship laser', async ({ page }, info) => {
      test.setTimeout(150_000)
      const { errors } = await stage(page, 'ui-rover-survey', { click: ['deploy-rover-survey-confirm'] })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const cont = page.getByTestId('rover-continue-to-laser')
      await expect(cont).toBeDisabled()
      await page.locator('[data-testid^="rover-outcrop-"]').first().click({ timeout: 40_000 })
      await expect(page.getByTestId('rover-survey-readout')).toContainText('OBSERVATION LOGGED')
      await expect(cont).toBeEnabled()
      await page.screenshot({ path: info.outputPath(`rover-survey-${vp}.png`) })
      expect(errors).toEqual([])
    })
  })
}
