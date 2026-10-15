import { expect, test } from '@playwright/test'
import { VIEWPORTS, expectSound, stage } from './helpers'

const biomes = ['mountains', 'desert', 'tundra', 'coast'] as const

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`intro onboarding ${vp}`, () => {
    test.use({ viewport: size })

    test('new player: backdrop follows the picked landscape, copy is plain, and the layout is sound', async ({ page }, info) => {
      const { errors } = await stage(page, 'm1-intro')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const world = page.getByTestId('base-world-canvas')
      await expect(page.getByRole('heading', { name: 'Choose where to build' })).toBeVisible()
      await expect(page.locator('body')).not.toContainText(/commander/i)
      for (const id of biomes) {
        await page.getByTestId(`base-biome-${id}`).click()
        await expect(page.getByTestId(`base-biome-${id}`)).toHaveAttribute('aria-pressed', 'true')
        await expect(world).toHaveAttribute('data-biome', id)
        await expect(page.getByTestId(`base-biome-${id}`)).toContainText(/\S+/)
        await page.waitForTimeout(1500) // the world rebuilds for the new landscape and its art loads
        await page.screenshot({ path: info.outputPath(`intro-${id}-${vp}.png`) })
      }
      // Every card carries a label, a tagline and one trait chip; the begin button stays in view.
      await expect(page.locator('.base-biome-trait')).toHaveCount(4)
      const begin = (await page.getByTestId('intro-begin-btn').boundingBox())!
      expect(begin.y + begin.height).toBeLessThanOrEqual(size.height)
      await expect(page.getByTestId('intro-begin-btn')).toHaveText('ESTABLISH BASE')
      await expectSound(page, errors)
    })

    test('returning player resumes with no landscape picker and no "Commander"', async ({ page }, info) => {
      const { errors } = await stage(page, 'm1-intro', { patch: { missionsDone: 3, francs: 4200, earthBiome: 'tundra' } })
      await expect(page.getByTestId('intro-begin-btn')).toHaveText('RESUME OPERATIONS')
      await expect(page.getByTestId('base-biome-choice')).toHaveCount(0)
      await expect(page.getByTestId('base-world-canvas')).toHaveAttribute('data-biome', 'tundra')
      await expect(page.locator('body')).not.toContainText(/commander/i)
      await page.waitForTimeout(1500)
      await page.screenshot({ path: info.outputPath(`intro-returning-${vp}.png`) })
      await expectSound(page, errors)
    })
  })
}
