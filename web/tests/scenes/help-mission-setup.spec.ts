import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-434: the shared "?" on Contract, Launch review (Map/Blueprint/Hangar assembly/Launch) and Hangar.
const SCREENS: Array<[string, string]> = [['ui-mission-board', 'contract'], ['m1-fab', 'launch-review'], ['ui-hangar-assembly', 'hangar']]

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`mission setup help ${vp}`, () => {
    test.use({ viewport: size })
    for (const [preset, name] of SCREENS) {
      test(`${name} shows "?" clear of Back and opens a sheet`, async ({ page }, info) => {
        await stage(page, preset)
        expect(await page.evaluate(() => innerWidth)).toBe(size.width)
        const help = page.getByTestId('help-button').first()
        await expect(help).toBeVisible()
        const hb = (await help.boundingBox())!
        expect(hb.width).toBeGreaterThanOrEqual(44)
        const back = page.getByRole('button', { name: 'Back' }).first()
        if (await back.count()) {
          const bb = (await back.boundingBox())!
          const overlap = hb.x < bb.x + bb.width && hb.x + hb.width > bb.x && hb.y < bb.y + bb.height && hb.y + hb.height > bb.y
          expect(overlap).toBe(false)
        }
        await help.click()
        await expect(page.getByTestId('help-sheet')).toBeVisible()
        expect(await page.getByTestId('help-card').count()).toBeGreaterThanOrEqual(2)
        await page.screenshot({ path: info.outputPath(`help-${name}-${vp}.png`) })
        if (vp === 'phone') await page.screenshot({ path: `${process.env.HOME}/Navigation/orbit-review/review-feed/playwright-ssl434-${name}.png` })
      })
    }
  })
}
