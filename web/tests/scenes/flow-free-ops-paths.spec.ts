import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// The pad opens the Mission Board. Client contracts and the own-program chain are tabs there.
// A branch menu is not painted over the launchpad scene.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`free ops paths ${vp}`, () => {
    test.use({ viewport: size })
    test('the pad opens the mission board and does not paint a branch menu', async ({ page }, info) => {
      await stage(page, 'ui-launchpad')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await expect(page.getByTestId('launchpad-new-mission-menu')).toHaveCount(0)
      await page.getByTestId('rocket-builder-target').click()
      await expect(page.getByTestId('mission-board')).toBeVisible()
      await expect(page.getByTestId('mission-board-tab-contracts')).toBeVisible()
      await expect(page.getByTestId('mission-board-tab-program')).toBeVisible()
      await expect(page.getByTestId('launchpad-new-mission-menu')).toHaveCount(0)
      await page.screenshot({ path: info.outputPath(`free-ops-board-${vp}.png`) })
    })
  })
}
