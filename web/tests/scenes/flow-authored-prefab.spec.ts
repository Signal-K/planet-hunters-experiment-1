import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

for (const [viewport, size] of Object.entries(VIEWPORTS)) {
  test.describe(`authored prefab ${viewport}`, () => {
    test.use({ viewport: size })

    test('the real rocket and mission hotspot consume shared local geometry', async ({ page }) => {
      const { errors } = await stage(page, 'telescope-fab')
      expect(await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))).toEqual({ w: size.width, h: size.height })
      const prefab = page.getByTestId('launchpad-complex')
      await expect(prefab).toHaveAttribute('data-engine-prefab', 'launchpad')
      const bounds = (await prefab.boundingBox())!
      const rocket = (await prefab.locator('[data-engine-object="staged-rocket"]').boundingBox())!
      expect((rocket.x - bounds.x + rocket.width / 2) / bounds.width).toBeCloseTo(0.326, 3)
      expect((rocket.y - bounds.y + rocket.height) / bounds.height).toBeCloseTo(0.908, 3)
      await expect(page.getByTestId('launch-rocket')).toBeVisible()
      expect(await page.getByTestId('launch-rocket').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
      await page.screenshot({ path: `tests/.out/authored-prefab-${viewport}.png` })
      await page.getByTestId('launchpad-status-card').click()
      await expect(page.locator('[data-stage-screen]')).toHaveAttribute('data-stage-screen', 'missions')
      expect(errors).toEqual([])
    })

    test('the editor exposes migration gaps and can scroll below the full-width preview', async ({ page }) => {
      await page.goto('/game/studio?scene=launchpad&tab=project')
      await expect(page.getByTestId('studio')).toBeVisible()
      await page.getByTestId('project-inventory').scrollIntoViewIfNeeded()
      await expect(page.getByTestId('engine-migration-status')).toContainText('4 objects use shared geometry')
      await expect(page.getByTestId('project-inventory')).toContainText('27/26')
      await expect(page.getByTestId('project-inventory')).toContainText('refinery')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `tests/.out/authored-editor-${viewport}.png` })
    })
  })
}
