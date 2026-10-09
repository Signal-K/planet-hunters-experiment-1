import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-449: after training, no contract is needed. New Mission offers self-directed branches beside contracts,
// and every branch is one tap from the pad.
const BRANCHES = [
  'launchpad-new-mission-mining-btn',
  'launchpad-new-mission-build-btn',
  'launchpad-new-mission-control-station-btn',
  'launchpad-new-mission-market-btn',
  'launchpad-new-mission-contracts-btn',
]

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`free ops paths ${vp}`, () => {
    test.use({ viewport: size })
    test('New Mission offers every self-directed branch and contracts are only one of them', async ({ page }, info) => {
      await stage(page, 'ui-launchpad')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await page.getByTestId('launchpad-new-mission-btn').click()
      const menu = page.getByTestId('launchpad-new-mission-menu')
      await expect(menu).toBeVisible()
      for (const id of BRANCHES) await expect(page.getByTestId(id), id).toBeVisible()
      await page.screenshot({ path: info.outputPath(`free-ops-menu-${vp}.png`) })
      await page.getByTestId('launchpad-new-mission-mining-btn').click()
      const brief = page.getByTestId('launchpad-operation-brief-mining')
      await expect(brief).toBeVisible()
      await expect(brief).toContainText(/no client/i)
      await page.screenshot({ path: info.outputPath(`free-ops-mining-brief-${vp}.png`) })
    })
  })
}
