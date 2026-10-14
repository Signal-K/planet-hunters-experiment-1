import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

const biomes = ['mountains', 'desert', 'tundra', 'coast'] as const

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`base biomes ${vp}`, () => {
    test.use({ viewport: size })
    for (const biome of biomes) {
      test(`${biome} draws the base world for its landscape`, async ({ page }, info) => {
        await stage(page, 'm1-hub', { patch: { earthBiome: biome }, chrome: true })
        expect(await page.evaluate(() => innerWidth)).toBe(size.width)
        // The world is game objects on a canvas (SSL-423): the canvas carries the biome it draws.
        const world = page.getByTestId('base-world-canvas')
        await expect(world).toHaveAttribute('data-biome', biome)
        await page.screenshot({ path: info.outputPath(`base-biome-${biome}-${vp}.png`) })
      })
    }
  })
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`biome onboarding and relocation ${vp}`, () => {
    test.use({ viewport: size })
    test('onboarding preview selection enters the game with the selected landscape', async ({ page }, info) => {
      await stage(page, 'm1-intro')
      const coast = page.getByTestId('base-biome-coast')
      await coast.click()
      await expect(coast).toHaveAttribute('aria-pressed', 'true')
      const choiceBox = (await page.getByTestId('base-biome-choice').boundingBox())!
      const beginBox = (await page.getByTestId('intro-begin-btn').boundingBox())!
      expect(choiceBox.y).toBeGreaterThanOrEqual(0)
      expect(choiceBox.y + choiceBox.height).toBeLessThanOrEqual(size.height)
      expect(beginBox.y + beginBox.height).toBeLessThanOrEqual(size.height)
      await page.screenshot({ path: info.outputPath(`biome-onboarding-${vp}.png`) })
      await page.getByTestId('intro-begin-btn').click()
      await expect(page.locator('[data-stage-ready="true"]')).toHaveAttribute('data-stage-screen', 'build')
    })

    test('existing player can move once and the hub scene follows the selected landscape', async ({ page }, info) => {
      await stage(page, 'm1-hub', { patch: { placed: ['launchpad'], earthBiome: 'mountains' } })
      await page.getByTestId('settings-button').click()
      const choices = page.getByRole('group', { name: 'Choose a new base landscape' })
      await choices.getByRole('button', { name: 'coast' }).click()
      await page.getByRole('button', { name: 'Move', exact: true }).click()
      await page.getByRole('button', { name: 'Confirm move' }).click()
      await expect(choices).toHaveCount(0)
      await page.getByTestId('settings-close').click()
      await expect(page.getByTestId('base-world-canvas')).toHaveAttribute('data-biome', 'coast')
      await page.screenshot({ path: info.outputPath(`biome-relocation-${vp}.png`) })
    })
  })
}
