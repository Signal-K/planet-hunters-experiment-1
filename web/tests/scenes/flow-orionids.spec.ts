import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-578: Orionids entry from Base opens the event panel; mining shows falling debris.
const OUT = process.env.SNAPSHOT_DIR ?? 'test-results/orionids'

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test(`orionids panel on base at ${name}`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.addInitScript(() => {
      (window as unknown as { __LANDNAM_FORCE_ORIONIDS: boolean }).__LANDNAM_FORCE_ORIONIDS = true
    })
    await stage(page, 'm1-hub', { patch: { badges: { 'orionids-2026': { eventId: 'orionids-2026', tier: 'gold', earnedAt: 1792620000000 } } } })
    expect(await page.evaluate(() => window.innerWidth)).toBe(size.width)
    await page.getByTestId('sky-event-chip').first().click()
    const panel = page.getByTestId('orionids-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Peak')
    await expect(page.getByTestId('orionids-share')).toBeVisible()
    await expect(page.getByTestId('orionids-return-hook')).toContainText('Launch again')
    await page.screenshot({ path: `${OUT}/base-panel-${name}.png` })
  })
}

test('orionids debris animates while laser mining', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone)
  await page.addInitScript(() => {
    (window as unknown as { __LANDNAM_FORCE_ORIONIDS: boolean }).__LANDNAM_FORCE_ORIONIDS = true
  })
  await stage(page, 'm1-mining')
  await page.waitForTimeout(2500)
  for (let i = 0; i < 3; i++) {
    await page.screenshot({ path: `${OUT}/mining-frame-${i + 1}.png` })
    await page.waitForTimeout(700)
  }
})
