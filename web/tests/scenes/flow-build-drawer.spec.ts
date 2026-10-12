import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// The flat marker field and its build drawer are gone. The phone survey is the drive scene.
test.describe('phone', () => {
  test.use({ viewport: VIEWPORTS.phone })
  test('rover survey is a drive scene with hold controls', async ({ page }, info) => {
    await stage(page, 'ui-rover-survey')
    expect(await page.evaluate(() => innerWidth)).toBe(390)
    await expect(page.getByTestId('rover-drive-canvas')).toBeVisible()
    await expect(page.locator('[data-testid^="rover-outcrop-"]')).toHaveCount(0)
    const drive = page.getByTestId('rover-drive-right')
    await expect(drive).toBeVisible()
    const box = await drive.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: info.outputPath('rover-drive-phone.png') })
  })
})
