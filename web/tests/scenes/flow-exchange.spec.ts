import { expect, test } from '@playwright/test'
import { expectSound, stage, VIEWPORTS } from './helpers'

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`Exchange dock ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const { errors } = await stage(page, 'ui-market')
    expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
    await expect(page.getByTestId('settings-button')).toBeVisible()
    await expect(page.getByTestId('hub-clock-widget')).toBeVisible()
    await expect(page.getByTestId('base-dock')).toBeVisible()
    await expect(page.getByTestId('exchange-scene')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'EXCHANGE' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cargo', exact: true })).toHaveCount(0)
    await expect(page.getByTestId('market-build-toggle')).toHaveCount(0)
    await expect(page.getByText(/open the tower/i)).toHaveCount(0)
    await expect(page.locator('[data-testid="base-camera"]')).toHaveCount(0)
    await expect(page.getByTestId('exchange-crate-iron')).toBeVisible()
    await expect(page.getByTestId('exchange-price-iron')).toBeVisible()
    await expect(page.getByTestId('exchange-sell-pad')).toBeVisible()

    const before = await page.getByTestId('exchange-francs').innerText()
    await page.getByTestId('exchange-crate-iron').click()
    await expect(page.getByTestId('exchange-francs')).not.toHaveText(before)
    await expect(page.getByTestId('exchange-crate-iron')).toContainText('39')

    const nickel = page.getByTestId('exchange-crate-nickel')
    const pad = page.getByTestId('exchange-sell-pad')
    const crateBox = await nickel.boundingBox()
    const padBox = await pad.boundingBox()
    expect(crateBox && padBox).toBeTruthy()
    if (crateBox && padBox) {
      await page.mouse.move(crateBox.x + crateBox.width / 2, crateBox.y + 24)
      await page.mouse.down()
      await page.mouse.move(padBox.x + padBox.width / 2, padBox.y + padBox.height / 2, { steps: 10 })
      await page.mouse.up()
    }
    await expect(page.getByTestId('exchange-crate-nickel')).toContainText('19')

    await page.getByTestId('sell-all-btn').click()
    await expect(page.getByTestId('sell-all-btn')).toContainText(/confirm/i)
    await page.getByTestId('sell-all-btn').click()
    await expect(page.getByText('Hold is empty', { exact: true })).toBeVisible()
    await expect(page.getByTestId('sell-all-btn')).toBeDisabled()

    await expectSound(page, errors)
    await page.getByTestId('hub-dock-prev').click()
    await expect(page.locator('.market-screen')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
