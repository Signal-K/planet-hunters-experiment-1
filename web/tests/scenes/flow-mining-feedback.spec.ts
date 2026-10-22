import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-344: firing the laser always gives a visible cue (red lane flash on a miss, cyan on a hit),
// and the fire control is a full-size tap target on a phone.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`mining feedback ${vp}`, () => {
    test.use({ viewport: size })
    test('fire shows a hit or miss cue and the control is 44px', async ({ page }) => {
      await page.addInitScript(() => { try { localStorage.setItem('ln-help-seen:mining', '1') } catch { /* private window */ } })
      await stage(page, 'm1-mining')
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const fire = page.locator('[data-beacon="mining-fire-laser"], [data-testid="mining-fire-laser"]').first()
      await expect(fire).toBeVisible()
      // Fire stays disabled until the mining scene reports ready; on a loaded runner a click before that does nothing.
      await expect(fire).toBeEnabled({ timeout: 30_000 })
      const box = await fire.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      // Watch the canvas for the cue instead of polling frames: the flash lasts 280ms, and a loaded runner can render
      // slower than that. The miss wash is the canvas child with the red gradient.
      const cue = page.evaluate(() => new Promise<string>(resolve => {
        const canvas = document.querySelector('[data-testid="mining-canvas"]')
        if (!canvas) return resolve('none')
        const seen = (): string | null => {
          for (const el of Array.from(canvas.children) as HTMLElement[]) {
            if (el.style.opacity !== '1') continue
            if (el.dataset.testid === 'mining-hit-flash') return 'hit'
            if (el.style.background.includes('255, 90, 106')) return 'miss'
          }
          return null
        }
        const done = (result: string) => { observer.disconnect(); window.clearTimeout(timer); resolve(result) }
        const observer = new MutationObserver(() => { const result = seen(); if (result) done(result) })
        observer.observe(canvas, { subtree: true, attributes: true, childList: true })
        const timer = window.setTimeout(() => done(seen() ?? 'none'), 8000)
      }))
      await fire.dispatchEvent('click')
      expect(['hit', 'miss']).toContain(await cue)
    })
  })
}
