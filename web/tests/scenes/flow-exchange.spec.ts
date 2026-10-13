import { expect, test } from '@playwright/test'
import { stage, VIEWPORTS } from './helpers'

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`Exchange overlay ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const { errors } = await stage(page, 'ui-market')
    expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
    await expect(page.getByTestId('settings-button')).toBeVisible()
    await expect(page.getByTestId('base-camera')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'EXCHANGE' })).toBeVisible()
    const screen = page.locator('.market-screen')
    expect(await screen.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
    await page.screenshot({ path: `/Users/scroobz/Navigation/orbit-review/review-feed/ssl-557-web-${name}.png` })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `/Users/scroobz/Navigation/orbit-review/review-feed/ssl-557-web-${name}-frame2.png` })
    await page.getByTestId('market-build-toggle').click()
    await expect(page.getByTestId('market-recipes')).toBeVisible()
    await page.getByRole('button', { name: 'Cargo', exact: true }).click()
    await page.getByTestId('sell-all-btn').click()
    await expect(page.getByText('Sell all cargo', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm sell', exact: true }).click()
    await expect(page.getByText('No cargo', { exact: true })).toBeVisible()
    await page.getByTestId('market-back-btn').click()
    await expect(page.locator('.market-screen')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
