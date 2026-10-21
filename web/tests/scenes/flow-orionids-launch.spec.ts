import { expect, test } from '@playwright/test'
import { VIEWPORTS, expectSound } from './helpers'

// SSL-630: the rocket catches Orionid fragments on the way up, at any hour of the window.
// Ordinary window launch = 2, peak night (local 21 Oct 18:00 to 22 Oct 06:00) = 4, outside the window = none.
// Drives the real launch from the launch review in the full app (the stage shell has no toast layer),
// with the sky clock overridden (dev/staging only).
const CLOCKS = {
  window: { at: new Date(2026, 9, 25, 14, 0, 0).getTime(), fragments: 2 },
  peak: { at: new Date(2026, 9, 21, 23, 0, 0).getTime(), fragments: 4 },
  ended: { at: new Date(2026, 10, 10, 14, 0, 0).getTime(), fragments: 0 },
} as const

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`orionids launch catch ${vp}`, () => {
    test.use({ viewport: size })
    for (const [when, clock] of Object.entries(CLOCKS)) {
      test(`launch ${when === 'ended' ? 'after the window catches nothing' : `in the ${when} catches ${clock.fragments}`}`, async ({ page }, info) => {
        const errors: string[] = []
        page.on('pageerror', e => errors.push(e.message))
        await page.addInitScript(at => {
          (window as unknown as { __LANDNAM_DEV_NOW: number }).__LANDNAM_DEV_NOW = at
        }, clock.at)
        await page.goto('/game/ui/target-picker')
        expect(await page.evaluate(() => innerWidth)).toBe(size.width)

        const prepare = page.getByTestId('prepare-launch-btn')
        const launch = page.getByTestId('launch-btn')
        await expect(prepare.or(launch)).toBeVisible({ timeout: 30_000 })
        if (await prepare.isVisible()) await prepare.click()
        await expect(launch).toBeVisible({ timeout: 6000 })
        await launch.click()
        const skip = page.getByTestId('launch-sequence-skip-btn')
        if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click()

        // The launch itself must have happened, or "no toast" proves nothing.
        await expect(page.getByTestId('launch-btn')).toBeHidden({ timeout: 15_000 })
        const toast = page.locator('.toast-item', { hasText: /Orionid fragments caught on the way up/ })
        if (clock.fragments > 0) {
          await expect(toast).toBeVisible({ timeout: 15_000 })
          await expect(toast).toContainText(`${clock.fragments} Orionid fragments`)
          await expect(toast).toHaveCSS('opacity', '1')
        } else {
          await page.waitForTimeout(2000)
          await expect(toast).toHaveCount(0)
        }
        // Check the settled flight screen, not the half second of loading splash between the launch and it.
        await expect(page.getByTestId('transit-screen').or(page.locator('.mining-screen')).first()).toBeVisible({ timeout: 15_000 })
        await page.screenshot({ path: info.outputPath(`launch-${when}-${vp}.png`) })
        await expectSound(page, errors)
      })
    }
  })
}
