import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

const OUT = process.env.SNAPSHOT_DIR ?? 'test-results/help-screens'

// SSL-431: every screen listed here has a "?" that opens its help card, and none opens on its own.
const SCREENS: Array<[string, string, string]> = [
  ['transport-delivery', 'Cargo transfer', 'delivery'],
  ['telescope-transit', 'In flight', 'transit'],
  ['ui-landing', 'Landing and ascent', 'landing'],
  ['ui-refinery', 'Refinery', 'refinery'],
  ['ui-skill-tree', 'Skill tree', 'skills'],
  ['ui-academy', 'Astronaut academy', 'academy'],
  ['ui-surface-ops', 'Surface operations', 'surface-ops'],
]

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`help on screens ${vp}`, () => {
    test.use({ viewport: size })
    for (const [preset, title, id] of SCREENS) {
      test(`${id} has a "?" that opens ${title}`, async ({ page }) => {
        await stage(page, preset)
        expect(await page.evaluate(() => innerWidth)).toBe(size.width)
        await expect(page.getByTestId('help-sheet')).toHaveCount(0)
        const button = page.getByTestId('help-button')
        await expect(button).toBeVisible()
        const box = await button.boundingBox()
        expect(box?.width).toBeGreaterThanOrEqual(44)
        expect(box?.height).toBeGreaterThanOrEqual(44)
        await button.click()
        await expect(page.getByTestId('help-sheet')).toBeVisible()
        await expect(page.getByTestId('help-sheet')).toContainText(title)
        await page.screenshot({ path: `${OUT}/help-${id}-${vp}.png` })
      })
    }
  })
}
