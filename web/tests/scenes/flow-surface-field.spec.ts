import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-374: the Surface Ops FIELD canvas must start inside the first screen, never pushed below the fold.
const OUT = process.env.SNAPSHOT_DIR ?? 'test-results/surface-field'

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`surface ops field canvas is on the first screen at ${vp}`, async ({ page }) => {
    await page.setViewportSize(size)
    await stage(page, 'ui-surface-ops', { chrome: true, patch: { surfaceOps: { sites: { 'moon-south-pole': { storage: {}, siteAccessPurchasedAt: 1 } } } } })
    expect(await page.evaluate(() => innerWidth)).toBe(size.width)
    await page.getByTestId('surface-site-moon-south-pole').click({ timeout: 5000 })
    await page.getByRole('tab', { name: /FIELD/ }).click({ timeout: 5000 })
    await page.getByRole('button', { name: /Deploy Prospector/ }).click({ timeout: 5000 })
    const canvas = page.locator('[data-testid="surface-field-view"] canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    const top = (await canvas.boundingBox())?.y ?? Infinity
    await page.screenshot({ path: `${OUT}/surface-field-${vp}.png` })
    // At least 160px of terrain must be visible without scrolling.
    expect(top).toBeLessThan(size.height - 160)
  })
}
