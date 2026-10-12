import { expect, test } from '@playwright/test'

// SSL-430: body text stays at 14px and tappable controls stay at 44px on the
// exchange and the hangar customiser, at the 402px phone and in landscape.
const VIEWPORTS = [
  { name: '402', width: 402, height: 874 },
  { name: 'landscape', width: 926, height: 428 },
] as const

for (const vp of VIEWPORTS) {
  test.describe(`tap floor ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('exchange labels and recipe tabs', async ({ page }) => {
      await page.goto('/game/stage?preset=ui-market&chrome=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible()
      const tab = page.locator('[data-testid="market-recipe-tab-road"]')
      await expect(tab).toBeAttached()
      const box = await tab.boundingBox()
      expect(box && box.height >= 44 && box.width >= 44).toBe(true)
      const fonts = await page.evaluate(() => {
        const size = (sel: string) => {
          const el = document.querySelector(sel)
          return el ? parseFloat(getComputedStyle(el).fontSize) : 0
        }
        return {
          tab: size('[data-testid="market-recipe-tab-road"]'),
          label: size('[class*="sectionLabel"]'),
          note: size('[class*="quoteNote"]'),
          balance: size('[class*="balanceValue"]'),
        }
      })
      expect(fonts.tab).toBeGreaterThanOrEqual(14)
      expect(fonts.label).toBeGreaterThanOrEqual(14)
      expect(fonts.note).toBeGreaterThanOrEqual(14)
      expect(fonts.balance).toBeGreaterThanOrEqual(14)
    })

    test('hangar customiser tabs and close', async ({ page }) => {
      await page.goto('/game/stage?preset=ship-customizer&plan=1&click=open-ship-customizer')
      await expect(page.locator('[data-testid="ship-step-engine"]')).toBeVisible()
      const step = await page.locator('[data-testid="ship-step-engine"]').boundingBox()
      const close = await page.locator('[data-testid="ship-interior-close"]').boundingBox()
      expect(step && step.height >= 44 && step.width >= 44).toBe(true)
      expect(close && close.width >= 44 && close.height >= 44).toBe(true)
    })
  })
}
