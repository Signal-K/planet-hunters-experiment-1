import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-476: opening the Launchpad from Base lands on the Launchpad scene, never the underground.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`launchpad ${vp}`, () => {
    test.use({ viewport: size })

    test('tapping the Launchpad from Base opens the Launchpad, not the subsurface view', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true })
      await page.getByTestId('building-launchpad-hit').click()
      await expect(page.locator('[data-stage-screen]')).toHaveAttribute('data-stage-screen', 'hub')
      await expect(page.getByTestId('base-layer-scene')).toBeVisible()
      await expect(page.getByTestId('launchpad-focus-screen')).toBeVisible()
      await expect(page.getByTestId('hub-subsurface-view')).toHaveCount(0)
      await expect(page.getByTestId('subsurface-excavate-prompt')).toHaveCount(0)
      await page.screenshot({ path: `tests/.out/flow-launchpad-${vp}.png` })
      expect(errors).toEqual([])
    })

    test('the base dock keeps switch, Build, and Hub while Exchange stays in the scene', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true })
      await expect(page.getByRole('navigation', { name: 'Scene dock' }).getByRole('button')).toHaveCount(4)
      await expect(page.getByTestId('hub-dock-prev')).toBeVisible()
      await expect(page.getByTestId('hub-build-btn')).toBeVisible()
      await expect(page.getByTestId('hub-btn')).toBeVisible()
      await expect(page.getByTestId('hub-dock-next')).toBeVisible()
      await expect(page.getByTestId('hub-subsurface-btn')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Exchange' })).toBeVisible()
      await page.screenshot({ path: `tests/.out/hub-dock-${vp}.png` })
      expect(errors).toEqual([])
    })
  })
}
