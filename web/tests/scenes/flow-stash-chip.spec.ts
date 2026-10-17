import { expect, test } from '@playwright/test'
import { stage, VIEWPORTS } from './helpers'

// The cube chip in the shared HUD opens the base stash and offers a shortcut to sell it.
for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`Stash chip opens the hold on the base ${name}`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    const { errors } = await stage(page, 'telescope-hub', { patch: { stash: { iron: 20, nickel: 10 } } })
    expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
    const chip = page.getByTestId('hub-cargo-chip')
    await expect(chip).toContainText('30')
    await chip.click()
    await expect(page.getByTestId('stash-panel')).toBeVisible()
    await expect(page.getByTestId('stash-panel')).toContainText('×20')
    await page.screenshot({ path: info.outputPath(`stash-${name}.png`) })
    await page.getByTestId('stash-sell').click()
    await expect(page.getByTestId('stash-panel')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
