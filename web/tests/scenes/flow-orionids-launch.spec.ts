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

// The flight screens load as a chunk, so for about half a second after Launch the screen is the loading splash. The sticky
// fragment toast is already up by then. It must wait in the flight corner, not hop from the top over the tutorial strip.
test('toasts wait in the flight corner while a screen is loading', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  await page.goto('/game/ui/skill-tree')
  expect(await page.evaluate(() => innerWidth)).toBe(VIEWPORTS.phone.width)
  const stack = page.locator('.toast-stack')
  await expect(stack).toBeAttached({ timeout: 30_000 })
  await expect(page.locator('.game-screen-loading')).toHaveCount(0, { timeout: 30_000 })
  // Computed top is the used value in px, so compare where the stack actually sits.
  const topY = () => stack.evaluate(el => el.getBoundingClientRect().top)
  expect(await topY(), 'before the splash the stack is under the top bar').toBeLessThan(120)
  await page.evaluate(() => {
    const splash = document.createElement('div')
    splash.className = 'game-screen-loading'
    document.querySelector('.portrait-canvas')?.appendChild(splash)
  })
  await expect.poll(topY, { message: 'with the splash up the stack moves to the flight corner' }).toBeGreaterThan(VIEWPORTS.phone.height / 2)
})

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
        // The launch review is where a new player decides to fly: it must be sound at every size, not only the flight after it.
        if (when === 'window') {
          await page.screenshot({ path: info.outputPath(`review-${vp}.png`) })
          await expectSound(page, errors)
        }
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
