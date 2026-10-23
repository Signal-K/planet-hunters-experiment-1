import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-423 scene rule: contracts arrive over the live base, not on a text page.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`base event entry ${vp}`, () => {
    test.use({ viewport: size })
    test('the active Orionids chip opens the playable event board', async ({ page }, info) => {
      await stage(page, 'telescope-hub')
      await page.evaluate(() => localStorage.setItem('landnam.forceOrionids', '1'))
      await page.reload()
      const chip = page.getByTestId('sky-event-chip')
      await expect(chip).toBeVisible()
      await expect(page.getByTestId('orionids-banner')).toHaveCount(0)
      await chip.click()
      await expect(chip).toHaveCount(0)
      const participate = page.getByTestId('sky-event-participate')
      await expect(participate).toBeVisible()
      const readSky = page.getByTestId('orionids-read-sky')
      await expect(readSky).toBeVisible()
      const box = await participate.boundingBox()
      expect(box && box.height >= 44).toBe(true)
      await page.screenshot({ path: info.outputPath(`orionids-base-${vp}.png`) })
      await readSky.click()
      await expect(page.getByTestId('fireball-reading')).toBeVisible()
      await page.getByTestId('fireball-reading').getByRole('button', { name: 'Close' }).click()
      await participate.click()
      await expect(page.getByTestId('mission-board-events')).toBeVisible()
      await expect(page.getByTestId('events-orionids')).toBeVisible()
      await page.getByTestId('event-action-orionids-2026').click()
      await expect(page.getByTestId('mission-launch-review')).toBeVisible()
      await expect(page.getByTestId('mission-launch-review')).toContainText(/Orionids shower run/i)
      await expect(page.getByTestId('mission-launch-review')).not.toContainText(/Hydrogen/i)
    })
  })

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
      await page.getByTestId('mission-board-close').click()
      await expect(page.locator('[data-screen="hub"]')).toBeVisible()
      await page.screenshot({ path: info.outputPath(`dispatch-close-${vp}.png`) })
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
          // Orionids is upcoming before 19 Oct local and live from then until 8 Nov.
          await expect(page.getByTestId('events-group-live').or(page.getByTestId('events-group-upcoming')).first()).toBeVisible()
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
      const map = page.getByTestId('galaxy-map')
      await expect(map).toBeVisible()
      // Contracts sit on a calm ambient map. The belt is picked from Free run.
      await expect(map).toHaveAttribute('data-mode', 'ambient')
      await expect(page.getByTestId('mission-board-section-client')).toBeVisible()
      const accept = page.locator('[data-testid^="mission-accept-"]')
      await expect(accept).toBeVisible()
      const acceptBox = await accept.boundingBox()
      expect(acceptBox && acceptBox.height >= 44).toBe(true)
      await page.waitForTimeout(300)
      await page.screenshot({ path: info.outputPath(`belt-${vp}.png`) })
      await page.getByTestId('mission-board-tab-free').click()
      await expect(page.getByTestId('mission-board-free')).toBeVisible()
      await expect(map).toHaveAttribute('data-mode', 'pick')
      if ((await map.getAttribute('data-view')) !== 'system') await page.getByTestId('map-back').click()
      await expect(map).toHaveAttribute('data-view', 'system')
      await page.getByTestId('map-belt').click()
      await expect(page.getByTestId('map-back')).toBeVisible()
      await page.getByTestId('map-node-bennu').click()
      await expect(page.getByTestId('map-node-bennu')).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByTestId('free-run-start')).toBeEnabled()
      await page.waitForTimeout(300)
      await page.screenshot({ path: info.outputPath(`free-${vp}.png`) })
    })
  })
}
