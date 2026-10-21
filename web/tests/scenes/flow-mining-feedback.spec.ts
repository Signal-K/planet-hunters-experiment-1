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
      const box = await fire.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      // Sample every frame while the laser flies; the miss wash is the canvas child with the red gradient.
      const cue = page.evaluate(() => new Promise<string>(resolve => {
        const t0 = performance.now()
        const tick = () => {
          const canvas = document.querySelector('[data-testid="mining-canvas"]')
          for (const el of Array.from(canvas?.children ?? []) as HTMLElement[]) {
            if (el.style.opacity !== '1') continue
            if (el.dataset.testid === 'mining-hit-flash') return resolve('hit')
            if (el.style.background.includes('255, 90, 106')) return resolve('miss')
          }
          if (performance.now() - t0 > 4000) return resolve('none')
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }))
      await fire.dispatchEvent('click')
      expect(['hit', 'miss']).toContain(await cue)
    })
  })
}
