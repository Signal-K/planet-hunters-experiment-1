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
      const dockEl = document.querySelector('.mining-guide-dock')!
      const dock = dockEl.getBoundingClientRect()
      const close = document.querySelector('.mining-guide-x')!
      const cr = close.getBoundingClientRect()
      const scroll = document.querySelector('.mining-guide-scroll')!.getBoundingClientRect()
      const hits = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
      const covered = [...document.querySelectorAll('.mining-guide-card')].filter(row => {
        const r = row.getBoundingClientRect()
        const top = Math.max(r.top, scroll.top)
        const bottom = Math.min(r.bottom, scroll.bottom)
        if (bottom - top < 8) return false
        const visible = new DOMRect(r.left, top, r.width, bottom - top)
        return hits(visible, cr)
      }).map(row => (row.textContent || '').slice(0, 24))
      const hud = document.querySelector('.laser-hud')
      const order = document.querySelector('.laser-order')
      const recharge = document.querySelector('[data-testid="mining-overflow-recharge-btn"]')!.getBoundingClientRect()
      const scrub = document.querySelector('[data-testid="mining-scrub-btn"]')!.getBoundingClientRect()
      return {
        covered,
        hudHidden: !hud || getComputedStyle(hud).display === 'none',
        orderHidden: !order || order.getClientRects().length === 0,
        closeInView: cr.top >= 0 && cr.bottom <= innerHeight && cr.height >= 44 && cr.width >= 44,
        closeFont: parseFloat(getComputedStyle(close).fontSize),
        dockH: dock.height,
        dockW: dock.width,
        flat: getComputedStyle(dockEl).backgroundImage === 'none',
        stackedActions: scrub.top >= recharge.bottom + 8 && Math.abs(scrub.width - recharge.width) < 2,
        chargesVisible: [...document.querySelectorAll('.mining-guide-card')].some(row => /charges/i.test(row.textContent || '') && row.getBoundingClientRect().top < scroll.bottom - 8),
      }
    })
    expect(report.covered).toEqual([])
    expect(report.hudHidden).toBe(true)
    expect(report.orderHidden).toBe(true)
    expect(report.closeInView).toBe(true)
    expect(report.closeFont).toBeGreaterThanOrEqual(14)
    expect(report.dockH).toBeGreaterThan(300)
    expect(report.dockW).toBeGreaterThan(390)
    expect(report.flat).toBe(true)
    expect(report.stackedActions).toBe(true)
    expect(report.chargesVisible).toBe(true)
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

  test('customiser primary stays in view and the training strip is hidden', async ({ page }) => {
    const patch = encodeURIComponent(JSON.stringify({ flightPlan: { completed: { mining: true, scan: true }, hidden: false } }))
    await page.goto(`/game/stage?preset=ship-customizer&plan=1&click=open-ship-customizer&patch=${patch}`)
    await expect(page.getByTestId('ship-primary')).toBeVisible()
    await expect(page.locator('.flight-plan')).toBeHidden()
    await expect(page.getByTestId('ship-refund-step')).toHaveCount(0)
    const report = await page.evaluate(() => {
      const primary = document.querySelector('[data-testid="ship-primary"]')!.getBoundingClientRect()
      const card = document.querySelector('.ship-part-option') as HTMLElement
      return {
        primaryH: primary.height,
        primaryTop: primary.top,
        primaryBottom: primary.bottom,
        viewH: window.innerHeight,
        cardBg: getComputedStyle(card).backgroundColor,
      }
    })
    expect(report.primaryH).toBeGreaterThanOrEqual(44)
    expect(report.primaryTop).toBeGreaterThanOrEqual(0)
    expect(report.primaryBottom).toBeLessThanOrEqual(report.viewH)
    expect(report.cardBg).toBe('rgb(255, 255, 255)')
    await page.getByTestId('choose-ion-thruster-t1').click()
    await expect(page.getByTestId('choose-ion-thruster-t1')).toContainText('Installed')
    await expect(page.getByTestId('ship-primary')).toHaveText('NEXT')
    await page.getByTestId('ship-primary').click()
    await expect(page.getByTestId('ship-stage')).toContainText('2/4')
    await page.getByTestId('choose-strap-booster-t1').click()
    await page.getByTestId('ship-primary').click()
    await page.getByTestId('choose-cockpit-command-t1').click()
    await page.getByTestId('ship-primary').click()
    await page.getByTestId('choose-cargo-payload-t1').click()
    await expect(page.getByTestId('ship-primary')).toHaveText('CONFIRM')
    await expect(page.getByTestId('ship-stage')).toContainText('4/4')
  })

  test('exchange dev badge stays off the settings cog', async ({ page }) => {
    await page.goto('/game/stage?preset=ui-market&chrome=1&dev=1')
    await expect(page.getByTestId('settings-button')).toBeVisible()
    await expect(page.getByTestId('dev-shortcuts-toggle')).toBeVisible()
    const over = await page.evaluate(() => {
      const dev = document.querySelector('[data-testid="dev-shortcuts-toggle"]')!.getBoundingClientRect()
      const cog = document.querySelector('[data-testid="settings-button"]')!.getBoundingClientRect()
      return Math.min(dev.right, cog.right) - Math.max(dev.left, cog.left) > 2 && Math.min(dev.bottom, cog.bottom) - Math.max(dev.top, cog.top) > 2
    })
    expect(over).toBe(false)
  })
})
