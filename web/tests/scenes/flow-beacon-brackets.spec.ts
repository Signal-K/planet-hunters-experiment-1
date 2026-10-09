import { expect, test } from '@playwright/test'
import { VIEWPORTS, stage } from './helpers'

// SSL-444: the beaconed control draws lock-on brackets 7px outside itself; they must not touch another control.
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  test.describe(`beacon brackets ${vp}`, () => {
    test.use({ viewport: size })
    test('brackets are drawn from CSS and clear of neighbouring controls', async ({ page }, info) => {
      await stage(page, 'm1-hub', { chrome: true, patch: { flightPlan: { completed: {}, hidden: false } } })
      await page.goto(page.url() + '&plan=1')
      await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(1500)
      expect(await page.evaluate(() => innerWidth)).toBe(size.width)
      const report = await page.evaluate(() => {
        const flight = document.documentElement.getAttribute('data-flight-target') ?? ''
        const ids = flight.split(' ').filter(Boolean)
        const target = ids.map(id => document.querySelector<HTMLElement>(`[data-beacon="${id}"]`)).find(el => el && el.getBoundingClientRect().width > 0)
        if (!target) return { flight, found: false, overlaps: [] as string[], content: '', inset: '' }
        const after = getComputedStyle(target, '::after')
        const r = target.getBoundingClientRect()
        const box = { l: r.left - 7, t: r.top - 7, r: r.right + 7, b: r.bottom + 7 }
        const overlaps: string[] = []
        for (const el of document.querySelectorAll<HTMLElement>('button, a, [role=button]')) {
          if (el === target || el.contains(target) || target.contains(el)) continue
          const q = el.getBoundingClientRect()
          if (q.width === 0 || q.height === 0) continue
          if (q.left < box.r && q.right > box.l && q.top < box.b && q.bottom > box.t) overlaps.push((el.innerText || el.getAttribute('aria-label') || el.tagName).slice(0, 24))
        }
        return { flight, found: true, overlaps, content: after.content, inset: after.top }
      })
      await page.screenshot({ path: info.outputPath(`beacon-brackets-${vp}.png`) })
      expect(report.found, report.flight).toBe(true)
      expect(report.content).toBe('""')
      expect(report.inset).toBe('-7px')
      expect(report.overlaps).toEqual([])
    })
  })
}
