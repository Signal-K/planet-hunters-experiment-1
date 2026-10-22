import { expect, test } from '@playwright/test'
import { expectSound, stage, VIEWPORTS } from './helpers'

// SSL-663: the stamp calendar and community bar open straight from a preset, with no play history.
for (const [size, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(size, () => {
    test.use({ viewport })

    test(`empty month shows no stamps and no streak (${size})`, async ({ page }) => {
      const { errors } = await stage(page, 'ui-research-calendar-empty')
      expect(await page.evaluate(() => innerWidth)).toBe(viewport.width)
      const cal = page.getByTestId('research-calendar')
      await cal.scrollIntoViewIfNeeded()
      await expect(cal).toBeVisible()
      await expect(cal.locator('[data-stamped="true"]')).toHaveCount(0)
      await expect(page.getByTestId('research-streak')).toHaveText('No streak yet')
      await page.screenshot({ path: test.info().outputPath(`calendar-empty-${size}.png`) })
      await expectSound(page, errors)
    })

    test(`half month shows stamps, a streak count and the community bar (${size})`, async ({ page }) => {
      const { errors } = await stage(page, 'ui-research-calendar-month-half')
      const cal = page.getByTestId('research-calendar')
      await cal.scrollIntoViewIfNeeded()
      await expect(cal.locator('[data-stamped="true"]').first()).toBeVisible()
      await expect(page.getByTestId('research-community-bar')).toBeVisible()
      await page.screenshot({ path: test.info().outputPath(`calendar-half-${size}.png`) })
      await expectSound(page, errors)
    })
  })
}

// Real path: a survey scan that has run its time resolves through the game loop and stamps today.
test('resolving a survey scan stamps today on the calendar', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  const { errors } = await stage(page, 'ui-research-calendar-empty', {
    patch: { activeScan: { targetId: 'eros', startedAt: Date.now() - 86_400_000 } },
  })
  const cal = page.getByTestId('research-calendar')
  await cal.scrollIntoViewIfNeeded()
  await expect(cal.locator('[data-today="true"][data-stamped="true"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('research-streak')).toHaveText('1 day running')
  expect(errors).toEqual([])
})
