import { expect, test } from '@playwright/test'
import { stage, VIEWPORTS } from './helpers'

for (const [viewport, size] of Object.entries(VIEWPORTS)) {
  test.describe(`sky-event location ${viewport}`, () => {
    test.use({ viewport: size })

    test('shows the coarse location controls and local Orionids window', async ({ page }, info) => {
      const staged = await stage(page, 'telescope-hub', {
        patch: { freeOperations: true, skyEventLocation: { city: 'Tallinn', latitude: 59, timeZone: 'Europe/Tallinn' } },
      })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await page.getByTestId('hub-menu-btn').click()
      await page.getByTestId('base-menu-settings').click()
      const settings = page.getByTestId('sky-event-location-settings')
      await settings.scrollIntoViewIfNeeded()
      await expect(settings).toBeVisible()
      await expect(settings.getByText(/No longitude or GPS/i)).toBeVisible()
      await expect(settings.locator('select')).toHaveValue('Tallinn')
      expect(staged.errors).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      for (const control of await settings.locator('button,input,select').all()) {
        const box = await control.boundingBox()
        expect(box && box.height >= 44).toBe(true)
      }
      await page.screenshot({ path: info.outputPath(`sky-event-location-${viewport}.png`) })
      await page.getByTestId('settings-close').click()

      await page.evaluate(() => localStorage.setItem('landnam.forceOrionids', '1'))
      await page.reload()
      await page.getByTestId('sky-event-chip').click()
      await expect(page.getByTestId('orionids-local-window')).toContainText('Tallinn')
      await page.screenshot({ path: info.outputPath(`orionids-local-window-${viewport}.png`) })
    })
  })
}
