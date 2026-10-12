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

    test('exchange cargo list and build toggle', async ({ page }) => {
      await page.goto('/game/stage?preset=ui-market&chrome=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible()
      await expect(page.getByText('Commodity Exchange')).toHaveCount(0)
      await expect(page.getByText('Base · Resource Desk')).toHaveCount(0)
      const sell = await page.locator('[data-testid="sell-all-btn"]').boundingBox()
      const build = await page.locator('[data-testid="market-build-toggle"]').boundingBox()
      const back = await page.locator('[data-testid="market-back-btn"]').boundingBox()
      expect(sell && sell.height >= 44 && sell.width >= 44).toBe(true)
      expect(build && build.height >= 44 && build.width >= 44).toBe(true)
      expect(back && back.height >= 44 && back.width >= 44).toBe(true)
      const cargoSize = await page.locator('[data-testid="commodity-iron"] [class*="name"]').evaluate(el => parseFloat(getComputedStyle(el).fontSize))
      await page.getByTestId('market-build-toggle').click()
      await expect(page.locator('[data-testid="market-recipe-field-road"]')).toBeVisible()
      const fonts = await page.evaluate(() => {
        const size = (sel: string) => {
          const el = document.querySelector(sel)
          return el ? parseFloat(getComputedStyle(el).fontSize) : 0
        }
        return {
          balance: size('[data-testid="market-balance"]'),
          recipe: size('[data-testid="market-recipe-field-road"] [class*="name"]'),
          sell: size('[data-testid="sell-all-btn"]'),
        }
      })
      expect(cargoSize).toBeGreaterThanOrEqual(14)
      expect(fonts.balance).toBeGreaterThanOrEqual(14)
      expect(fonts.recipe).toBeGreaterThanOrEqual(14)
      expect(fonts.sell).toBeGreaterThanOrEqual(14)
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
