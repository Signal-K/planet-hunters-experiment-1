import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-476: opening the Launchpad from Base lands on the Launchpad scene, never the underground.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`launchpad ${vp}`, () => {
    test.use({ viewport: size })

    test('tapping the Launchpad from Base opens the Launchpad, not the subsurface view', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true, click: ['building-launchpad-hit'] })
      await expect(page.locator('[data-stage-screen]')).toHaveAttribute('data-stage-screen', 'launchpad')
      await expect(page.getByTestId('hub-subsurface-view')).toHaveCount(0)
      await expect(page.getByTestId('subsurface-excavate-prompt')).toHaveCount(0)
      await page.screenshot({ path: `tests/.out/flow-launchpad-${vp}.png` })
      expect(errors).toEqual([])
    })

    test('the underground deck keeps Surface and Launchpad above the tray', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true })
      await page.getByTestId('hub-subsurface-btn').click()
      await expect(page.getByTestId('hub-subsurface-view')).toBeVisible()
      await expect(page.getByTestId('subsurface-surface-btn')).toBeVisible()
      await expect(page.getByTestId('subsurface-launchpad-btn')).toBeVisible()
      await page.getByTestId('subsurface-launchpad-btn').click()
      await expect(page.locator('[data-stage-screen]')).toHaveAttribute('data-stage-screen', 'launchpad')
      await expect(page.getByTestId('hub-subsurface-view')).toHaveCount(0)
      expect(errors).toEqual([])
    })
  })
}
