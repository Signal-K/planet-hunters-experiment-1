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

    test('the scene dock is Previous, Build, Hub, and Next while the Exchange is a building the player chooses to build', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true })
      const dock = page.getByRole('navigation', { name: 'Scene dock' })
      await expect(dock.getByRole('button')).toHaveCount(4)
      await expect(dock.getByTestId('hub-dock-prev')).toBeVisible()
      await expect(dock.getByTestId('hub-build-btn')).toBeVisible()
      await expect(dock.getByTestId('hub-btn')).toBeVisible()
      await expect(dock.getByTestId('hub-dock-next')).toBeVisible()
      await expect(page.getByTestId('hub-subsurface-btn')).toHaveCount(0)
      await expect(dock.getByText('Exchange', { exact: true })).toHaveCount(0)
      // The Exchange is a building players choose to build, never a top-bar button.
      await expect(page.getByTestId('hub-exchange')).toHaveCount(0)
      await page.screenshot({ path: `tests/.out/hub-dock-${vp}.png` })
      expect(errors).toEqual([])
    })
  })
}
