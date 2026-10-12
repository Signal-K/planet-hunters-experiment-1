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

  test('hangar actions sit on the base at 4.5:1', async ({ page }) => {
    await page.goto('/game/stage?preset=ship-customizer&chrome=1')
    await expect(page.locator('[data-testid="base-layer-scene"]')).toBeVisible()
    await expect(page.locator('[data-testid="hangar-fleet-grid"]')).toHaveCount(0)
    const action = page.locator('[data-testid="open-ship-customizer"]')
    await expect(action).toBeVisible()
    const paint = await action.evaluate(el => {
      const s = getComputedStyle(el)
      return { color: s.color, background: s.backgroundColor, opacity: s.opacity }
    })
    expect(Number(paint.opacity)).toBe(1)
    expect(ratio(channel(paint.color), channel(paint.background))).toBeGreaterThanOrEqual(4.5)
  })
})

for (const vp of [{ name: '402', width: 402, height: 874 }, { name: 'landscape', width: 926, height: 428 }] as const) {
  test(`customiser controls clear 4.5:1 at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/game/stage?preset=ship-customizer&plan=1&click=open-ship-customizer')
    await expect(page.locator('[data-testid="ship-primary"]')).toBeVisible()
    const blue = await page.locator('.ship-interior-preview').evaluate(el => getComputedStyle(el).getPropertyValue('--ln-bp-blue').trim())
    expect(blue).toBe('#175f9b')
    const paints = await page.evaluate(() => {
      const opaque = (el: Element) => {
        let node: Element | null = el
        while (node) {
          const bg = getComputedStyle(node).backgroundColor
          const parts = bg.replace(/rgba?\(|\)/g, '').split(',').map(n => parseFloat(n))
          const alpha = parts.length === 4 ? parts[3] : 1
          if (alpha > 0.9) return bg
          node = node.parentElement
        }
        return 'rgb(255, 255, 255)'
      }
      const read = (sel: string) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const s = getComputedStyle(el)
        return { color: s.color, background: opaque(el), opacity: s.opacity }
      }
      return {
        primary: read('[data-testid="ship-primary"]'),
        back: read('[data-testid="ship-step-back"]'),
        stage: read('.sip-stage-label'),
        budget: read('[data-testid="ship-budget"]'),
        note: read('.sip-budget-note'),
        part: read('.sip-part-name'),
        price: read('.sip-part-price'),
      }
    })
    for (const paint of Object.values(paints)) {
      expect(paint).not.toBeNull()
      expect(Number(paint!.opacity)).toBe(1)
      expect(ratio(channel(paint!.color), channel(paint!.background))).toBeGreaterThanOrEqual(4.5)
    }
  })
}
