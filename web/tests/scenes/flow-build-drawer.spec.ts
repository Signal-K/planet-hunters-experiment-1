import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-404: on a phone the off-world build drawer rests as one row and folds back when a placement starts.
test.describe('phone', () => {
  test.use({ viewport: VIEWPORTS.phone })
  test('build drawer is one row high when closed and expands on demand', async ({ page }, info) => {
    await stage(page, 'ui-rover-mining', { click: ['deploy-surface-ops-confirm', 'rover-build-mode-toggle'] })
    expect(await page.evaluate(() => innerWidth)).toBe(390)
    const panel = page.getByTestId('sandbox-field-controls')
    await expect(panel).toBeVisible()
    await page.screenshot({ path: info.outputPath('build-drawer-closed-phone.png') })
    const closed = await panel.boundingBox()
    const pad = await page.getByTestId('rover-control-guide').boundingBox()
    expect(closed!.y + closed!.height).toBeLessThanOrEqual(pad!.y + 1)
    expect(closed!.height).toBeLessThanOrEqual(72)
    await page.getByTestId('sandbox-drawer-expand').click()
    await expect(page.getByTestId('sandbox-build')).toBeVisible()
    await page.screenshot({ path: info.outputPath('build-drawer-open-phone.png') })
    await page.locator('[data-testid^="sandbox-recipe-"]').first().click()
    await expect(page.getByTestId('sandbox-build')).toBeHidden()
  })
})
