import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-560: launch review is the rocket builder. Preparing still buys the vehicle and then offers Launch.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`workshop rollout ${vp}`, () => {
    test.use({ viewport: size })
    test('the builder prepares the vehicle and then offers launch', async ({ page }, info) => {
      await stage(page, 'ui-target-picker', { patch: { francs: 500_000_000 } })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await expect(page.getByTestId('rocket-builder')).toBeVisible()
      const before = await page.getByTestId('rocket-builder-stats').getAttribute('data-range')
      await page.getByTestId('builder-part-engine').click()
      await page.getByTestId('builder-option-ion-thruster-t1').click()
      await expect(page.getByTestId('rocket-builder-stats')).not.toHaveAttribute('data-range', before ?? '')
      await page.screenshot({ path: info.outputPath(`workshop-${vp}.png`) })
      await page.getByTestId('prepare-launch-btn').click()
      await expect(page.getByTestId('launch-btn')).toBeVisible({ timeout: 6000 })
      await page.screenshot({ path: info.outputPath(`pad-${vp}.png`) })
    })
    test('part cards update the blueprint loadout on the launch review', async ({ page }, info) => {
      await stage(page, 'ui-target-picker', { patch: { francs: 500_000_000, crewModuleResearched: true } })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await page.getByTestId('builder-part-cargo-hold').click()
      await page.getByTestId('builder-option-cargo-payload-t1').click()
      await expect(page.getByTestId('builder-part-cargo-hold')).toHaveAttribute('data-part', 'cargo-payload-t1')
      await page.screenshot({ path: info.outputPath(`customiser-${vp}.png`) })
    })
  })
}
