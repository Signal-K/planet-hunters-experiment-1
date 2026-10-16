import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-503: the base camera pans with a drag (inertia, soft bounds) and zooms with the wheel.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`base camera ${vp}`, () => {
    test.use({ viewport: size })
    test('wheel zooms in, drag pans inside the bounds, zoom out returns home', async ({ page }, info) => {
      await stage(page, 'm1-hub', { chrome: true })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const cam = page.locator('[data-testid="base-camera"]')
      const world = page.locator('[data-testid="base-camera-world"]')
      await expect(cam).toHaveAttribute('data-zoom', '1.00')
      const cx = size.width / 2
      const cy = size.height / 2
      await page.mouse.move(cx, cy)
      await page.mouse.wheel(0, -700)
      await page.waitForTimeout(200)
      const zoom = Number(await cam.getAttribute('data-zoom'))
      expect(zoom).toBeGreaterThan(1.5)
      await page.mouse.move(cx, cy)
      await page.mouse.down()
      await page.mouse.move(cx + 120, cy + 40, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(900)
      const t = await world.evaluate(el => new DOMMatrix(getComputedStyle(el).transform))
      expect(t.e).toBeLessThanOrEqual(0.5)
      expect(t.e).toBeGreaterThanOrEqual(size.width * (1 - zoom) - 0.5)
      await page.screenshot({ path: info.outputPath(`base-camera-${vp}.png`) })
      await page.mouse.wheel(0, 3000)
      await page.waitForTimeout(200)
      await expect(cam).toHaveAttribute('data-zoom', '1.00')
    })
  })
}
