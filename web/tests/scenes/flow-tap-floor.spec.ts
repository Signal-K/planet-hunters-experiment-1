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

    test('hangar customiser chevron, close and primary', async ({ page }) => {
      await page.goto('/game/stage?preset=ship-customizer&plan=1&click=open-ship-customizer')
      await expect(page.locator('[data-testid="ship-primary"]')).toBeVisible()
      await expect(page.locator('[data-testid="ship-step-engine"]')).toHaveCount(0)
      await expect(page.getByText(/build config/i)).toHaveCount(0)
      const back = await page.locator('[data-testid="ship-step-back"]').boundingBox()
      const close = await page.locator('[data-testid="ship-interior-close"]').boundingBox()
      const primary = await page.locator('[data-testid="ship-primary"]').boundingBox()
      const card = await page.locator('.ship-part-option').first().boundingBox()
      expect(back && back.width >= 44 && back.height >= 44).toBe(true)
      expect(close && close.width >= 44 && close.height >= 44).toBe(true)
      expect(primary && primary.height >= 44).toBe(true)
      expect(card && card.height >= 44 && card.width >= 44).toBe(true)
      const fonts = await page.evaluate(() => {
        const size = (sel: string) => {
          const el = document.querySelector(sel)
          return el ? parseFloat(getComputedStyle(el).fontSize) : 0
        }
        return {
          stage: size('.sip-stage-label'),
          name: size('.sip-part-name'),
          desc: size('.sip-part-desc'),
          budget: size('[data-testid="ship-budget"]'),
          primary: size('[data-testid="ship-primary"]'),
        }
      })
      expect(fonts.stage).toBeGreaterThanOrEqual(14)
      expect(fonts.name).toBeGreaterThanOrEqual(14)
      expect(fonts.desc).toBeGreaterThanOrEqual(14)
      expect(fonts.budget).toBeGreaterThanOrEqual(14)
      expect(fonts.primary).toBeGreaterThanOrEqual(14)
    })
  })
}
