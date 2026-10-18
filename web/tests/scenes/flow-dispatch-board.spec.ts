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
      await expect(page.getByTestId('help-button')).toHaveCount(1)
      const accept = board.locator('[data-testid^="mission-accept-"]')
      await expect(accept).toBeVisible()
      const box = await accept.boundingBox()
      expect(box && box.height >= 44 && box.width >= 44).toBe(true)
      await page.waitForTimeout(600)
      await page.screenshot({ path: info.outputPath(`dispatch-${vp}.png`) })
    })
  })

  test.describe(`board tabs ${vp}`, () => {
    test.use({ viewport: size })
    test('program and events share the dark board look', async ({ page }, info) => {
      await stage(page, 'ui-mission-board')
      for (const tab of ['program', 'events']) {
        await page.getByTestId(`mission-board-tab-${tab}`).click({ timeout: 5000 })
        await expect(page.getByTestId(`mission-board-${tab}`)).toBeVisible()
        if (tab === 'program') {
          await page.locator('[data-testid^="program-step-"]').nth(1).click()
          await expect(page.getByTestId('program-step-detail')).toContainText('Launch Saturn satellite')
        }
        if (tab === 'events') {
          await expect(page.getByTestId('events-group-upcoming')).toBeVisible()
          await expect(page.getByTestId('events-group-ended')).toBeVisible()
          await expect(page.getByTestId('event-action-draconids-2026')).toHaveText('PLAY FOR SILVER')
          const action = page.getByTestId('event-action-draconids-2026')
          const actionBox = await action.boundingBox()
          expect(actionBox && actionBox.height >= 44).toBe(true)
        }
        await page.waitForTimeout(300)
        await page.screenshot({ path: info.outputPath(`tab-${tab}-${vp}.png`) })
      }
    })
  })

  test.describe(`board map ${vp}`, () => {
    test.use({ viewport: size })
    test('asteroids live in a zoomable belt and a free run is picked on the map', async ({ page }, info) => {
      await stage(page, 'ui-mission-board')
      await expect(page.getByTestId('galaxy-map')).toBeVisible()
      // Asteroid contracts now open directly in their destination region.
      if (await page.getByTestId('map-belt').isVisible()) await page.getByTestId('map-belt').click()
      await expect(page.getByTestId('map-back')).toBeVisible()
      await page.getByTestId('map-node-bennu').click()
      await expect(page.getByTestId('mission-setup-scaffold')).toHaveAttribute('data-contract-target', 'bennu')
      await expect(page.getByTestId('map-node-bennu')).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByTestId('mission-destination-result')).toContainText(/Bennu/i)
      await expect(page.getByTestId('mission-destination-result')).toContainText(/\d+ contracts?/i)
      const clear = page.getByTestId('mission-destination-clear')
      const clearBox = await clear.boundingBox()
      expect(clearBox && clearBox.height >= 44).toBe(true)
      await page.waitForTimeout(300)
      await page.screenshot({ path: info.outputPath(`belt-${vp}.png`) })
      await page.getByTestId('map-back').click()
      await page.getByTestId('map-inner').click()
      await expect(page.getByTestId('galaxy-map')).toHaveAttribute('data-view', 'inner')
      await expect(page.getByLabel('Earth')).toBeVisible()
      await page.getByTestId('map-back').click()
      const free = page.getByTestId('mission-board-tab-free')
      test.skip(!(await free.isVisible()), 'free run tab needs Free Ops')
      await free.click()
      await expect(page.getByTestId('mission-board-free')).toBeVisible()
      await page.getByTestId('map-node-mars').click()
      await expect(page.getByTestId('free-run-start')).toBeEnabled()
      await page.waitForTimeout(300)
      await page.screenshot({ path: info.outputPath(`free-${vp}.png`) })
    })
  })
}
