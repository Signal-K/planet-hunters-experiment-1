import { expect, test } from '@playwright/test'
import { expectSound, stage, VIEWPORTS } from './helpers'

// The Marketplace is a panel: spot prices and balance, selling for everyone,
// buying and sell alerts once the Exchange is built.
for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`Marketplace panel ${name}`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    const { errors } = await stage(page, 'ui-market')
    expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
    // SSL-645: the Marketplace is a panel over the Exchange scene with its own Back, no dock.
    await expect(page.getByTestId('market-back')).toBeVisible()
    await expect(page.getByTestId('marketplace-panel')).toBeVisible()
    await expect(page.getByTestId('market-balance')).toBeVisible()
    await expect(page.getByTestId('exchange-price-iron')).toBeVisible()
    await expect(page.getByTestId('market-price-iron')).toBeVisible()

    // Sell
    const before = await page.getByTestId('market-balance').innerText()
    await page.getByTestId('exchange-crate-iron').click()
    await expect(page.getByTestId('market-balance')).not.toHaveText(before)
    await expect(page.getByTestId('exchange-price-iron')).toContainText('19 held')
    await page.screenshot({ path: info.outputPath(`marketplace-sell-${name}.png`) })

    // Buy (the Exchange is built in this preset)
    await page.getByTestId('market-tab-buy').click()
    const sellPrice = await page.getByTestId('market-price-iron').innerText()
    await page.getByTestId('market-buy-iron').click()
    await page.getByTestId('market-tab-sell').click()
    await expect(page.getByTestId('exchange-price-iron')).toContainText('20 held')
    expect(sellPrice).toBeTruthy()

    // Alerts: a target at or below spot fires straight away, and can be cleared.
    await page.getByTestId('market-tab-alerts').click()
    await page.getByTestId('market-alert-set-nickel').click()
    await expect(page.getByTestId('market-alert-clear-nickel')).toBeVisible()
    await page.screenshot({ path: info.outputPath(`marketplace-alerts-${name}.png`) })
    await page.getByTestId('market-alert-clear-nickel').click()
    await expect(page.getByTestId('market-alert-clear-nickel')).toHaveCount(0)

    await page.getByTestId('market-tab-sell').click()
    await page.getByTestId('sell-all-btn').click()
    await expect(page.getByTestId('sell-all-btn')).toContainText(/confirm/i)
    await page.getByTestId('sell-all-btn').click()
    await expect(page.getByTestId('sell-all-btn')).toBeDisabled()

    await expectSound(page, errors)
    await page.getByTestId('market-back').click()
    await expect(page.locator('.market-screen')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
