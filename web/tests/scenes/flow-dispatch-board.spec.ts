import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-423 scene rule: contracts arrive over the live base, not on a text page.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`dispatch board ${vp}`, () => {
    test.use({ viewport: size })
    test('the contract is a work order over the live base', async ({ page }, info) => {
      await stage(page, 'ui-mission-board')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const board = page.getByTestId('mission-board')
      await expect(board).toBeVisible()
      const accept = board.locator('[data-testid^="mission-accept-"]')
      await expect(accept).toBeVisible()
      const box = await accept.boundingBox()
      expect(box && box.height >= 44 && box.width >= 44).toBe(true)
      await page.waitForTimeout(600)
      await page.screenshot({ path: info.outputPath(`dispatch-${vp}.png`) })
    })
  })
}
