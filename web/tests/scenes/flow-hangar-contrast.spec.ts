import { expect, test } from '@playwright/test'

function channel(css: string) {
  return css.replace(/rgba?\(|\)/g, '').split(',').slice(0, 3).map(n => Math.round(parseFloat(n)))
}

function ratio(a: number[], b: number[]) {
  const lin = (c: number) => {
    const x = c / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  const L = (rgb: number[]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
  const hi = Math.max(L(a), L(b))
  const lo = Math.min(L(a), L(b))
  return (hi + 0.05) / (lo + 0.05)
}

test.describe('hangar contrast', () => {
  test.use({ viewport: { width: 926, height: 428 } })

  test('registry tier chips sit on paper at 4.5:1', async ({ page }) => {
    await page.goto('/game/stage?preset=ship-customizer&chrome=1')
    await expect(page.locator('[data-testid="hangar-fleet-grid"]')).toBeVisible()
    const tier = await page.locator('[data-testid="hangar-fleet-grid"]').evaluate(grid => {
      const el = [...grid.querySelectorAll('[class*="tier"]')].find(node => (node.textContent || '').trim().startsWith('TIER'))
      if (!el) return null
      const s = getComputedStyle(el)
      return { color: s.color, background: s.backgroundColor, opacity: s.opacity }
    })
    expect(tier).not.toBeNull()
    expect(Number(tier!.opacity)).toBe(1)
    expect(ratio(channel(tier!.color), channel(tier!.background))).toBeGreaterThanOrEqual(4.5)
    const locked = page.locator('[data-testid="hangar-fleet-grid"] article').nth(2)
    const faded = await locked.evaluate(el => getComputedStyle(el).opacity)
    expect(Number(faded)).toBe(1)
  })
})

test('customiser controls clear 4.5:1 at 402px', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 })
  await page.goto('/game/stage?preset=ship-customizer&plan=1&click=open-ship-customizer')
  await expect(page.locator('[data-testid="confirm-ship-config"]')).toBeVisible()
  const blue = await page.locator('.ship-interior-preview').evaluate(el => getComputedStyle(el).getPropertyValue('--ln-bp-blue').trim())
  expect(blue).toBe('#175f9b')
  for (const sel of ['[data-testid="confirm-ship-config"]', '[data-testid="ship-step-back"]', '[data-testid="ship-step-next"]', '[data-testid="ship-refund-step"]']) {
    const paint = await page.locator(sel).evaluate(el => {
      const s = getComputedStyle(el)
      return { color: s.color, background: s.backgroundColor, opacity: s.opacity }
    })
    expect(Number(paint.opacity)).toBe(1)
    expect(ratio(channel(paint.color), channel(paint.background))).toBeGreaterThanOrEqual(4.5)
  }
})
