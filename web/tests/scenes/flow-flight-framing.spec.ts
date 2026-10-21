import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-534: in flight the asteroid is never cut off at the edge, the screen is not left empty,
// and the rocket is the core stage only (no boosters in space).
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`flight framing ${vp}`, () => {
    test.use({ viewport: size })
    for (const preset of ['m1-return', 'telescope-transit']) {
      test(`${preset}: asteroid and rocket sit inside the screen`, async ({ page }) => {
        await stage(page, preset)
        expect(await page.evaluate(() => innerWidth)).toBe(size.width)
        await page.waitForTimeout(1500)
        for (const id of ['transit-destination', 'transit-rocket']) {
          const box = await page.getByTestId(id).boundingBox()
          expect(box, id).not.toBeNull()
          expect(box!.x, `${id} left`).toBeGreaterThanOrEqual(0)
          expect(box!.x + box!.width, `${id} right`).toBeLessThanOrEqual(size.width)
          expect(box!.y, `${id} top`).toBeGreaterThanOrEqual(0)
          expect(box!.y + box!.height, `${id} bottom`).toBeLessThanOrEqual(size.height)
        }
        await expect(page.getByTestId('transit-rocket').locator('[data-part="booster"], [data-booster]')).toHaveCount(0)
      })
    }
  })
}
