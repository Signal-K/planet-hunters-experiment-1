import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-624: the standalone Contracts board shows the balance and stash chip again, clear of the help button.
const OUT = process.env.SNAPSHOT_DIR ?? 'test-results/board-balance'

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`mission board balance chip at ${vp}`, async ({ page }) => {
    await page.setViewportSize(size)
    await stage(page, 'ui-mission-board')
    expect(await page.evaluate(() => innerWidth)).toBe(size.width)
    const chip = page.getByTestId('mission-board-balance')
    await expect(chip).toBeVisible()
    await expect(chip).toContainText('₣')
    if (size.width > 560) await expect(chip).toContainText(' U')
    const box = await chip.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    const help = await page.getByTestId('help-button').boundingBox()
    if (box && help) {
      // Never over the help button, and never over the tab rail.
      const apart = box.x + box.width <= help.x + 1 || box.y >= help.y + help.height - 1
      expect(apart).toBe(true)
      for (const id of ['mission-board-tab-contracts', 'mission-board-tab-events', 'mission-board-log']) {
        const tab = await page.getByTestId(id).boundingBox()
        if (tab) expect(box.x + box.width <= tab.x || box.x >= tab.x + tab.width || box.y >= tab.y + tab.height || box.y + box.height <= tab.y).toBe(true)
      }
    }
    await page.screenshot({ path: `${OUT}/board-balance-${vp}.png` })
  })
}
