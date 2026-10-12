import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// Starter-rover survey: log one exposed outcrop, then continue to the ship laser. The rover does not extract cargo.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    test('logging an outcrop enables continue to the ship laser', async ({ page }, info) => {
      test.setTimeout(150_000)
      const { errors } = await stage(page, 'ui-rover-survey')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const cont = page.getByTestId('rover-continue-to-laser')
      await expect(cont).toBeDisabled()
      await expect(page.getByTestId('rover-drive-canvas')).toBeVisible()
      await page.keyboard.down('ArrowRight')
      await expect(page.getByTestId('rover-scan')).toBeEnabled({ timeout: 20_000 })
      await page.keyboard.up('ArrowRight')
      await page.getByTestId('rover-scan').click()
      await expect(page.getByTestId('rover-survey-readout')).toContainText('OBSERVATION LOGGED')
      await expect(cont).toBeEnabled()
      await page.screenshot({ path: info.outputPath(`rover-survey-${vp}.png`) })
      expect(errors).toEqual([])
    })
  })
}
