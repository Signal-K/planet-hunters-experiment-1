import { expect, test } from '@playwright/test'
import { stage } from './helpers'

// SSL-66: the playfield fills the whole landscape viewport, including the
// shortened ones a phone gets once browser tab/menu bars take their share.
const SIZES = { '844x390': { width: 844, height: 390 }, '915x412': { width: 915, height: 412 }, '844x330': { width: 844, height: 330 } }

for (const [name, size] of Object.entries(SIZES)) {
  test.describe(`landscape height ${name}`, () => {
    test.use({ viewport: size })

    test('game surface fills the viewport height and nothing clips', async ({ page }) => {
      const { errors } = await stage(page, 'm1-hub', { chrome: true })
      expect(await page.evaluate(() => innerHeight)).toBe(size.height)
      const box = await page.evaluate(() => {
        const r = document.querySelector('.portrait-canvas')!.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, scrollH: document.documentElement.scrollHeight, appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim() }
      })
      expect(box.appH).toBe('100dvh')
      expect(Math.abs(box.bottom - size.height)).toBeLessThanOrEqual(1)
      expect(box.top).toBeGreaterThanOrEqual(0)
      expect(box.scrollH).toBeLessThanOrEqual(size.height + 1)
      await page.screenshot({ path: `../docs/landscape-playfield/hub-${name}.png` })
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), 'page scrolls horizontally').toBe(false)
      expect(errors, 'uncaught page errors').toEqual([])
    })
  })
}
