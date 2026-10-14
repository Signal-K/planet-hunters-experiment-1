import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-478: the Flight Plan objective follows the player. /game/stage?plan=1 mounts the live strip.
const objective = (page: import('@playwright/test').Page) => page.locator('[data-testid="flight-plan-objective"]')

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`flight plan ${vp}`, () => {
    test.use({ viewport: size })

    test('mining try: Base directs the player to the launchpad tower', async ({ page }, info) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true, patch: { flightPlan: { completed: {}, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
      await expect(objective(page)).toContainText('Tap the tower')
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

    test('part try on the mining screen shows the laser step, not Fit a module', async ({ page }) => {
      await stage(page, 'm1-mining', { patch: { flightPlan: { completed: { mining: true, scan: true }, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId('mining-scene-status')).toHaveCount(0, { timeout: 30_000 })
      // onReady is raised as the Pixi loop starts; let its first visible frame paint.
      await page.waitForTimeout(800)
      await expect(objective(page)).toContainText('Fire the laser')
      await expect(page.getByTestId('flight-plan-kicker')).toHaveText(/Mining Ops · Step 5\/6/i)
      await expect(page.getByTestId('ops-badge')).toBeVisible()
      await expect(page.getByTestId('mining-training-tip')).toBeVisible()
      await expect(objective(page)).not.toContainText('Fit a module')
      await expect(page.getByText(/Fit a module/i)).toHaveCount(0)
    })

    test('live mining try shows the Ops laser step and Copy completion', async ({ page }, info) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await stage(page, 'm1-mining', { patch: { flightPlan: { completed: {}, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId('mining-scene-status')).toHaveCount(0, { timeout: 30_000 })
      await page.waitForTimeout(800)
      const cue = page.getByTestId('mining-training-tip')
      await expect(cue).toBeVisible()
      await expect(cue.getByTestId('ops-badge')).toBeVisible()
      const badgeBox = (await cue.getByTestId('ops-badge').boundingBox())!
      expect(badgeBox.width).toBeGreaterThanOrEqual(44)
      expect(badgeBox.height).toBeGreaterThanOrEqual(44)
      const cueMetrics = await cue.evaluate(el => {
        const rect = el.getBoundingClientRect()
        const color = getComputedStyle(el).backgroundColor.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0]
        return { left: rect.left, right: rect.right, height: rect.height, paperLuma: color.reduce((sum, channel) => sum + channel, 0) / 3 }
      })
      expect(cueMetrics.left).toBeGreaterThanOrEqual(0)
      expect(cueMetrics.right).toBeLessThanOrEqual(size.width)
      expect(cueMetrics.height).toBeLessThanOrEqual(64)
      expect(cueMetrics.paperLuma).toBeGreaterThan(200)
      await expect(cue.getByTestId('flight-plan-kicker')).toHaveText(/Mining Ops · Step 5\/6/i)
      expect(await cue.locator('.ops-bars i').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none')
      await page.screenshot({ path: info.outputPath(`flow-flightplan-laser-${vp}.png`) })
      await page.getByTestId('fire-laser-btn').click()
      await expect(cue.getByTestId('flight-plan-kicker')).toHaveText('Copy · Step 5 done')
      await expect(cue.getByTestId('ops-badge')).toHaveAttribute('data-state', 'done')
      await expect(cue.locator('.flight-plan-action')).toContainText('+1 stitch')
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
