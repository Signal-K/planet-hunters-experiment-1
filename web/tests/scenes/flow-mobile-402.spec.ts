import { expect, test } from '@playwright/test'

// SSL-493: the 402px Safari playtest. These are the five screens, checked
// as geometry rather than as a screenshot diff.
const VP = { width: 402, height: 874 }

function intersects(a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return w > 2 && h > 2
}

test.describe('402px mobile layout', () => {
  test.use({ viewport: VP })

  test('return transit keeps the progress bar clear of the dock', async ({ page }) => {
    const patch = encodeURIComponent(JSON.stringify({ returningToEarth: true, arrivalAt: Date.now() + 180_000 }))
    await page.goto(`/game/stage?preset=telescope-transit&patch=${patch}`)
    await expect(page.locator('[data-testid="transit-boost-btn"]')).toBeVisible()
    expect(await page.evaluate(() => innerWidth)).toBe(402)
    const boxes = await page.evaluate(() => {
      const r = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null
      return { progress: r('[data-testid="transit-progress"]'), dock: r('[data-testid="transit-boost-btn"]') }
    })
    expect(boxes.progress && boxes.dock && !intersects(boxes.progress, boxes.dock)).toBe(true)
    expect(boxes.progress!.right).toBeLessThanOrEqual(402)
    expect(boxes.dock!.bottom).toBeLessThanOrEqual(874)
  })

  test('mining guide rows are not covered by Close', async ({ page }) => {
    await page.goto('/game/stage?preset=m1-mining&click=mining-guide-btn')
    await expect(page.locator('.mining-guide-dock')).toBeVisible()
    const report = await page.evaluate(() => {
      const dock = document.querySelector('.mining-guide-dock')!.getBoundingClientRect()
      const close = [...document.querySelectorAll('.mining-guide-close')].find(el => (el.textContent || '').trim().toLowerCase() === 'close')!
      const cr = close.getBoundingClientRect()
      const scroll = document.querySelector('.mining-guide-scroll')!.getBoundingClientRect()
      const covered = [...document.querySelectorAll('.mining-guide-row')].filter(row => {
        const r = row.getBoundingClientRect()
        const top = Math.max(r.top, scroll.top)
        const bottom = Math.min(r.bottom, scroll.bottom)
        if (bottom - top < 8) return false
        const w = Math.min(r.right, cr.right) - Math.max(r.left, cr.left)
        const h = Math.min(bottom, cr.bottom) - Math.max(top, cr.top)
        return w > 2 && h > 2
      }).map(row => (row.textContent || '').slice(0, 24))
      const order = document.querySelector('.laser-order')?.getBoundingClientRect()
      const orderHit = order ? Math.min(order.bottom, dock.bottom) - Math.max(order.top, dock.top) > 2 && Math.min(order.right, dock.right) - Math.max(order.left, dock.left) > 2 : false
      return {
        covered,
        orderHit,
        closeInView: cr.top >= 0 && cr.bottom <= innerHeight && cr.height >= 44,
        closeFont: parseFloat(getComputedStyle(close).fontSize),
        dockH: dock.height,
        chargesVisible: [...document.querySelectorAll('.mining-guide-row')].some(row => /CHARGES/.test(row.textContent || '') && row.getBoundingClientRect().top < scroll.bottom - 8),
      }
    })
    expect(report.covered).toEqual([])
    expect(report.orderHit).toBe(false)
    expect(report.closeInView).toBe(true)
    expect(report.closeFont).toBeGreaterThanOrEqual(14)
    expect(report.dockH).toBeGreaterThan(300)
  })

  test('skip mining stays clear of the guide control and the order pill', async ({ page }) => {
    await page.goto('/game/stage?preset=m1-mining&dev=1')
    await expect(page.getByTestId('dev-skip-mining-btn')).toBeVisible()
    const hit = await page.evaluate(() => {
      const skip = document.querySelector('[data-testid="dev-skip-mining-btn"]')!.getBoundingClientRect()
      const guide = document.querySelector('[data-testid="mining-guide-btn"]')!.getBoundingClientRect()
      const order = document.querySelector('.laser-order')!.getBoundingClientRect()
      const over = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
      return { guide: over(skip, guide), order: over(skip, order), h: skip.height }
    })
    expect(hit.guide).toBe(false)
    expect(hit.order).toBe(false)
    expect(hit.h).toBeGreaterThanOrEqual(44)
  })

  test('customiser confirm and next stay above the training strip', async ({ page }) => {
    const patch = encodeURIComponent(JSON.stringify({ flightPlan: { completed: { mining: true, scan: true }, hidden: false } }))
    await page.goto(`/game/stage?preset=ship-customizer&plan=1&click=open-ship-customizer&patch=${patch}`)
    await expect(page.getByTestId('confirm-ship-config')).toBeVisible()
    const report = await page.evaluate(() => {
      const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect()
      const confirm = box('[data-testid="confirm-ship-config"]')
      const next = box('[data-testid="ship-step-next"]')
      const plan = box('.flight-plan')
      const over = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
      const card = document.querySelector('.ship-part-option') as HTMLElement
      return {
        confirmPlan: over(confirm, plan),
        nextPlan: over(next, plan),
        confirmH: confirm.height,
        nextH: next.height,
        confirmBottom: confirm.bottom,
        planTop: plan.top,
        cardBg: getComputedStyle(card).backgroundColor,
      }
    })
    expect(report.confirmPlan).toBe(false)
    expect(report.nextPlan).toBe(false)
    expect(report.confirmH).toBeGreaterThanOrEqual(44)
    expect(report.nextH).toBeGreaterThanOrEqual(44)
    expect(report.confirmBottom).toBeLessThanOrEqual(report.planTop)
    expect(report.cardBg).toBe('rgb(255, 255, 255)')
  })

  test('exchange dev badge stays off the back chevron', async ({ page }) => {
    await page.goto('/game/stage?preset=ui-market&chrome=1&dev=1')
    await expect(page.getByTestId('market-back-btn')).toBeVisible()
    await expect(page.getByTestId('dev-shortcuts-toggle')).toBeVisible()
    const over = await page.evaluate(() => {
      const dev = document.querySelector('[data-testid="dev-shortcuts-toggle"]')!.getBoundingClientRect()
      const back = document.querySelector('[data-testid="market-back-btn"]')!.getBoundingClientRect()
      return Math.min(dev.right, back.right) - Math.max(dev.left, back.left) > 2 && Math.min(dev.bottom, back.bottom) - Math.max(dev.top, back.top) > 2
    })
    expect(over).toBe(false)
  })
})
