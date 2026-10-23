import { expect, test } from '@playwright/test'

for (const viewport of [
  { name: 'portrait', width: 390, height: 844 },
  { name: 'landscape', width: 926, height: 428 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`SSL-635 Orionids entry reaches launch review at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByTestId('landing-orionids')).toBeVisible()
    await page.screenshot({ path: `/tmp/ssl-635-landing-${viewport.width}x${viewport.height}.png` })

    await page.getByTestId('landing-orionids').click()
    await expect(page.getByTestId('auth-gate-submit')).toHaveText('Continue to Orionids')
    await page.screenshot({ path: `/tmp/ssl-635-auth-${viewport.width}x${viewport.height}.png` })
    await page.getByTestId('auth-gate-quick-account').click()
    await expect(page.getByTestId('auth-gate-email')).toBeHidden({ timeout: 90_000 })
    await expect(page.getByTestId('mission-launch-review')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('plan-destination')).toContainText('433 Eros')
    await expect(page.getByText('Orionid Debris').first()).toBeVisible()
    await expect(page.getByTestId('flight-plan')).toHaveCount(0)
    await page.screenshot({ path: `/tmp/ssl-635-launch-${viewport.width}x${viewport.height}.png` })

    await page.evaluate(() => {
      const bridge = (window as typeof window & { __landnam?: { scenario: (name: string) => boolean } }).__landnam
      if (!bridge?.scenario('cp-late')) throw new Error('cp-late scenario unavailable')
    })
    await expect(page.locator('[data-screen="hub"]')).toBeVisible()
    // Settings, with sign-out, opens from the Base Menu.
    await page.getByTestId('hub-btn').click()
    await page.getByTestId('base-menu-settings').click()
    await expect(page.getByTestId('settings-sheet').getByRole('button', { name: 'Sign out' })).toBeVisible()
    await page.screenshot({ path: `/tmp/ssl-636-settings-${viewport.width}x${viewport.height}.png` })
    await page.getByTestId('settings-close').click()
    await page.getByTestId('hub-build-btn').click()
    await expect(page.getByTestId('hub-build-done-btn')).toBeVisible()
    await page.screenshot({ path: `/tmp/ssl-636-build-${viewport.width}x${viewport.height}.png` })
  })
}
