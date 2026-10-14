import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-571: client build jobs (fuel depot, battery station, fabrication pad) reach the real board.
// 2026-10-15: Arcturus posts a Fuel Depot build (drill tier 1, so a starter rocket can take it).
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`construct contract ${vp}`, () => {
    test.use({ viewport: size })
    test('a client build job shows on the board', async ({ page }, info) => {
      await page.clock.setFixedTime(new Date('2026-10-15T12:00:00'))
      await stage(page, 'ui-mission-board')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const board = page.getByTestId('mission-board')
      await expect(board).toBeVisible()
      const build = board.getByText(/^Build (Fuel Depot|Battery Station|Fabrication Pad)/i).first()
      for (let i = 0; i < 30 && !(await build.isVisible()); i++) {
        await page.getByTestId('mission-board-next').click()
      }
      await expect(build).toBeVisible()
      await page.screenshot({ path: info.outputPath(`construct-card-${vp}.png`) })
    })
  })
}
