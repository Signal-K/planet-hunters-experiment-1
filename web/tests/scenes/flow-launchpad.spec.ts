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

    test('the scene dock is Previous, Build, New mission, Menu, and Next while the Exchange is a building the player chooses to build', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true })
      const dock = page.getByRole('navigation', { name: 'Scene dock' })
      await expect(dock.getByRole('button')).toHaveCount(size.width < 480 ? 3 : 5)
      await expect(dock.getByTestId('hub-new-mission-btn')).toBeVisible()
      if (size.width >= 480) await expect(dock.getByTestId('hub-dock-prev')).toBeVisible()
      await expect(dock.getByTestId('hub-build-btn')).toBeVisible()
      await expect(dock.getByTestId('hub-menu-btn')).toBeVisible()
      if (size.width >= 480) await expect(dock.getByTestId('hub-dock-next')).toBeVisible()
      await expect(page.getByTestId('hub-subsurface-btn')).toHaveCount(0)
      await expect(dock.getByText('Exchange', { exact: true })).toHaveCount(0)
      // The Exchange is a building players choose to build, never a top-bar button.
      await expect(page.getByTestId('hub-exchange')).toHaveCount(0)
      await page.screenshot({ path: `tests/.out/hub-dock-${vp}.png` })
      expect(errors).toEqual([])
    })

    test('the Menu lists where to go from the base, and Contracts opens the contracts', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true })
      await page.getByTestId('hub-menu-btn').dispatchEvent('click')
      for (const id of ['build', 'contracts', 'market', 'mission-log']) await expect(page.getByTestId(`base-menu-${id}`)).toBeVisible()
      await page.screenshot({ path: `tests/.out/base-menu-${vp}.png` })
      await page.getByTestId('base-menu-contracts').dispatchEvent('click')
      await expect(page.locator('[data-stage-screen]')).toHaveAttribute('data-stage-screen', 'missions')
      expect(errors).toEqual([])
    })
  })
}
