import { expect, test } from '@playwright/test'
import { expectSound, stage, VIEWPORTS } from './helpers'

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`Deferred Exchange returns to Base ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const { errors } = await stage(page, 'ui-market')

    expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
    await expect(page.getByTestId('settings-button')).toBeVisible()
    await expect(page.getByTestId('hub-clock-widget')).toBeVisible()
    await expect(page.getByTestId('base-dock')).toBeVisible()
    await expect(page.locator('[data-testid="base-camera"]')).toBeVisible()

    await expect(page.getByTestId('exchange-scene')).toHaveCount(0)
    await expect(page.getByTestId('exchange-crate-iron')).toHaveCount(0)
    await expect(page.getByTestId('exchange-sell-pad')).toHaveCount(0)
    await expect(page.getByTestId('sell-all-btn')).toHaveCount(0)

    if (process.env.SNAPSHOT_DIR) {
      await page.screenshot({ path: `${process.env.SNAPSHOT_DIR}/deferred-exchange-${name}.png` })
    }

    await expectSound(page, errors)
    expect(errors).toEqual([])
  })
}
