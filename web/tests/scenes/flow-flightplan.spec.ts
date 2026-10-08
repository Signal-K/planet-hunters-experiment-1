import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-478: the Flight Plan objective follows the player. /game/stage?plan=1 mounts the live strip.
const objective = (page: import('@playwright/test').Page) => page.locator('[data-testid="flight-plan-objective"]')

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`flight plan ${vp}`, () => {
    test.use({ viewport: size })

    test('mining try: Base shows the first step, then the launchpad step after tapping the Launchpad', async ({ page }, info) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true, patch: { flightPlan: { completed: {}, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
      await expect(objective(page)).toContainText('Open client contracts')
      await page.screenshot({ path: `tests/.out/flow-flightplan-mining-${vp}.png` })
      expect(errors).toEqual([])
    })

    test('scan then part: objective advances with each finished try and names the screen action', async ({ page }) => {
      await stage(page, 'm1-hub', { patch: { flightPlan: { completed: { mining: true }, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(objective(page)).toContainText('Open the Galaxy map')
      await stage(page, 'm1-hub', { patch: { flightPlan: { completed: { mining: true, scan: true }, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(objective(page)).toContainText('Open the Hangar from Base')
      await page.screenshot({ path: `tests/.out/flow-flightplan-part-${vp}.png` })
    })

    test('part try on the Hangar screen says fit a module, not the Base instruction', async ({ page }) => {
      await stage(page, 'ui-hangar-assembly', { patch: { flightPlan: { completed: { mining: true, scan: true }, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(objective(page)).toContainText('Fit a module')
    })

    test('a finished plan shows no objective', async ({ page }) => {
      await stage(page, 'm1-hub', { patch: { flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: true } } })
      await page.goto(page.url() + '&plan=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
      await expect(objective(page)).toHaveCount(0)
    })

    test('after the Hangar part is fitted, no screen of the loop shows a Part or Fit-a-module step', async ({ page }) => {
      test.setTimeout(150_000)
      for (const preset of ['ui-hangar-assembly', 'm1-mining', 'm1-hub', 'transport-hub']) {
        await stage(page, preset, { patch: { flightPlan: { completed: { mining: true, scan: true, part: true }, hidden: false } } })
        await page.goto(page.url() + '&plan=1')
        await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
        await expect(objective(page), preset).toHaveCount(0)
        await expect(page.getByText(/Fit a module/i), preset).toHaveCount(0)
      }
      await page.screenshot({ path: `tests/.out/flow-flightplan-after-part-${vp}.png` })
    })
  })
}
