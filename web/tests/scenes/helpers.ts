import { expect, type Page } from '@playwright/test'

export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  landscape: { width: 926, height: 428 },
  desktop: { width: 1440, height: 900 },
} as const

/** Mount one screen from a dev preset. `patch` shallow-merges into the player; `click` clicks data-testids in order. */
export async function stage(page: Page, preset: string, opts: { patch?: object; click?: string[]; chrome?: boolean } = {}) {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  const q = new URLSearchParams({ preset })
  if (opts.patch) q.set('patch', JSON.stringify(opts.patch))
  if (opts.click?.length) q.set('click', opts.click.join(','))
  if (opts.chrome) q.set('chrome', '1')
  await page.goto(`/game/stage?${q}`)
  await expect(page.locator('[data-stage-ready="true"]')).toBeVisible({ timeout: 30_000 })
  if (opts.click?.length) await page.waitForTimeout(500 + opts.click.length * 700)
  await page.waitForTimeout(600)
  return { errors }
}

/** Structural checks any screen must pass: no Next overlay, no page-level horizontal scroll, no sub-14px text, no tap target under 44px, no two buttons overlapping. */
export async function expectSound(page: Page, errors: string[] = []) {
  const report = await page.evaluate(() => {
    const out = { overlay: '', hscroll: false, small: [] as string[], taps: [] as string[], overlaps: [] as string[] }
    const portal = document.querySelector('nextjs-portal')?.shadowRoot
    const t = portal ? [...portal.children].filter(n => n.tagName !== 'STYLE').map(n => n.textContent).join(' ') : ''
    if (/Build Error|Runtime Error|Parsing CSS/.test(t)) out.overlay = t.replace(/\s+/g, ' ').slice(0, 200)
    out.hscroll = document.documentElement.scrollWidth > innerWidth + 1
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
    }
    const label = (el: Element) => `${el.tagName.toLowerCase()}:${((el as HTMLElement).innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24).replace(/\s+/g, ' ')}`
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim())
      if (own && parseFloat(getComputedStyle(el).fontSize) < 13.9 && !el.closest('canvas,svg')) out.small.push(label(el))
    }
    const buttons = [...document.querySelectorAll('button,a[href],[role=button]')].filter(visible)
    for (const b of buttons) {
      const r = b.getBoundingClientRect()
      if (r.width < 43.5 || r.height < 43.5) out.taps.push(`${Math.round(r.width)}x${Math.round(r.height)} ${label(b)}`)
    }
    for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i], b = buttons[j]
      if (a.contains(b) || b.contains(a)) continue
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      // Scene hotspots (a whole building) are tall hit boxes by design; compare controls only.
      if (ra.height > 150 || rb.height > 150) continue
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (w > 4 && h > 4) out.overlaps.push(`${label(a)} x ${label(b)}`)
    }
    for (const k of ['small', 'taps', 'overlaps'] as const) out[k] = [...new Set(out[k])]
    return out
  })
  expect(report.overlay, 'Next error overlay').toBe('')
  expect(errors, 'uncaught page errors').toEqual([])
  expect(report.hscroll, 'page scrolls horizontally').toBe(false)
  expect(report.overlaps, 'buttons overlap each other').toEqual([])
  expect(report.taps, 'tap targets under 44px').toEqual([])
  expect(report.small, 'text under 14px').toEqual([])
}
