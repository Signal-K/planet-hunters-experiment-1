import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// Easy mining: one tap on an outcrop drives the rover there and drills on arrival; RETURN opens after drill three, no rig needed.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(vp, () => {
    test.use({ viewport: size })
    test('tapping outcrops auto-drills and opens RETURN after drill three', async ({ page }, info) => {
      test.setTimeout(150_000)
      const { errors } = await stage(page, 'ui-rover-mining', { click: ['deploy-surface-ops-confirm'] })
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      await expect(page.getByTestId('rover-drill-action')).toHaveCount(0)
      const back = page.getByTestId('rover-return-to-ship')
      await expect(back).toBeDisabled()
      const readout = page.getByTestId('rover-drill-readout')
      for (const [index, id] of ['ore-a', 'ore-b', 'ore-c'].entries()) {
        await page.getByTestId(`rover-ore-${id}`).click()
        await expect(readout).toContainText(`DRILL ${index + 1}`, { timeout: 40_000 })
        if (index < 2) await expect(back).toBeDisabled()
      }
      await expect(readout).toContainText('MINE SITE LOCATED')
      await expect(back).toBeEnabled()
      await expect(page.getByTestId('rover-mine-site-construction')).toContainText('START FIRST MINE RIG')
      await page.screenshot({ path: info.outputPath(`easy-rover-mining-${vp}.png`) })
      expect(errors).toEqual([])
    })
  })
}
