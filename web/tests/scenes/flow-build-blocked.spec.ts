import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-361: a build the player cannot afford says why, next to the picker, instead of doing nothing.
const OUT = process.env.SNAPSHOT_DIR ?? 'test-results/build-blocked'

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test(`blocked build shows its reason at ${vp}`, async ({ page }) => {
    await page.setViewportSize(size)
    await stage(page, 'ui-build', { chrome: true, patch: { francs: 0, stash: {} } })
    expect(await page.evaluate(() => innerWidth)).toBe(size.width)
    const options = page.locator('[data-testid^="build-option-"]')
    await expect(options.first()).toBeVisible()
    const ids = await options.evaluateAll(els => els.map(e => e.getAttribute('data-testid') ?? ''))
    const n = ids.length
    let reason = ''
    for (let i = 0; i < n; i++) {
      await page.getByTestId(ids[i]).dispatchEvent('click', undefined, { timeout: 3000 })
      const note = page.getByTestId('hub-place-note')
      const text = (await note.count()) ? (await note.textContent()) ?? '' : ''
      if (/Need|Not enough/.test(text)) { reason = text; break }
    }
    expect(reason, 'at least one option explains why it is blocked').not.toBe('')
    await page.screenshot({ path: `${OUT}/build-blocked-${vp}.png` })
  })
}
