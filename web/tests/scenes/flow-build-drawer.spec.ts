import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// The side-scroller and the flat marker field are gone. Survey is Takeon's field.
test.describe('phone', () => {
  test.use({ viewport: VIEWPORTS.phone })
  test('rover survey is the Takeon field without marker buttons', async ({ page }, info) => {
    await stage(page, 'ui-rover-survey')
    expect(await page.evaluate(() => innerWidth)).toBe(390)
    await expect(page.locator('[data-testid="rover-survey-screen"] canvas')).toBeVisible()
    await expect(page.locator('[data-testid^="rover-outcrop-"]')).toHaveCount(0)
    const scan = page.getByTestId('rover-scan')
    await expect(scan).toBeVisible()
    const box = await scan.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: info.outputPath('rover-takeon-phone.png') })
  })
})
