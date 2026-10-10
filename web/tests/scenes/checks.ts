import type { Page } from '@playwright/test'

// Deterministic evidence checks (SSL-507). No network, no vision API: everything is computed from the DOM and pixels.
// Each check RETURNS findings instead of asserting, so callers can record them (evidence index) and the self-test can prove they fire.

export type Finding = { check: string; detail: string }
export type CheckResult = { failures: string[]; skipped: string[] }

/** WCAG AA contrast of visible text against its resolved background. Large text (>=24px, or >=18.66px bold) needs 3:1, the rest 4.5:1.
 *  Backgrounds that are an image, gradient, canvas, video or svg cannot be resolved from the DOM; those are skipped with a recorded reason. */
export async function checkContrast(page: Page, root = 'body'): Promise<CheckResult> {
  return page.evaluate((rootSel) => {
    const failures: string[] = []; const skipped = new Set<string>()
    const cv = document.createElement('canvas'); cv.width = cv.height = 1
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    const parse = (c: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      // Alpha is premultiplied away by getImageData on a cleared canvas, so recover it from a second draw on white.
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1)
      const w = ctx.getImageData(0, 0, 1, 1).data
      const a = d[3] / 255
      return a === 0 ? [w[0], w[1], w[2], 0] : [d[0], d[1], d[2], a]
    }
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const over = (top: number[], a: number, bottom: number[]) => top.slice(0, 3).map((v, i) => v * a + bottom[i] * (1 - a))
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
    }
    const label = (el: Element) => `${el.tagName.toLowerCase()}:${((el as HTMLElement).innerText || '').trim().slice(0, 24).replace(/\s+/g, ' ')}`
    const scope = document.querySelector(rootSel) ?? document.body
    for (const el of scope.querySelectorAll('*')) {
      if (!visible(el)) continue
      if (!([...el.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim()))) continue
      if (el.closest('canvas,svg,script,style')) continue
      const cs = getComputedStyle(el)
      // Effective opacity down the tree.
      let op = 1; for (let n: Element | null = el; n; n = n.parentElement) op *= +getComputedStyle(n).opacity
      if (op < 0.05) continue // inside a faded-out ancestor: not on screen
      // Resolve background: nearest ancestors stacked until one is opaque.
      const layers: [number, number, number, number][] = []
      let unresolved = ''
      for (let n: Element | null = el; n; n = n.parentElement) {
        const s = getComputedStyle(n)
        if (s.backgroundImage && s.backgroundImage !== 'none') { unresolved = `background-image on ${n.tagName.toLowerCase()}`; break }
        const bg = parse(s.backgroundColor)
        if (bg[3] > 0) { layers.push(bg); if (bg[3] >= 0.999) break }
      }
      if (!unresolved) {
        // A canvas/video/img painted behind this text (same box) makes the background unknowable.
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const under = document.elementsFromPoint(Math.min(Math.max(cx, 0), innerWidth - 1), Math.min(Math.max(cy, 0), innerHeight - 1))
        const media = under.find(u => u !== el && !u.contains(el) && !el.contains(u) && /^(CANVAS|VIDEO|IMG|SVG)$/i.test(u.tagName))
        if (media) unresolved = `${media.tagName.toLowerCase()} behind text`
        // No opaque ancestor: the real backdrop is whatever a non-ancestor element (scene layer, gradient) paints behind the text.
        if (!unresolved && !layers.some(l => l[3] >= 0.999)) {
          const painter = under.find(u => u !== el && !u.contains(el) && !el.contains(u) && u !== document.documentElement && u !== document.body
            && (getComputedStyle(u).backgroundImage !== 'none' || parse(getComputedStyle(u).backgroundColor)[3] > 0))
          if (painter) unresolved = `${painter.tagName.toLowerCase()} paints behind text`
        }
      }
      if (unresolved) { skipped.add(`skipped: ${unresolved}`); continue }
      let bg: number[] = [255, 255, 255]
      for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], layers[i][3], bg)
      const fg = parse(cs.color)
      const fgRgb = over(fg, fg[3] * op, bg)
      const l1 = lum(fgRgb), l2 = lum(bg)
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700
      const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5
      if (ratio < need) failures.push(`${ratio.toFixed(2)}:1 < ${need}:1 ${label(el)}`)
    }
    return { failures: [...new Set(failures)], skipped: [...skipped] }
  }, root)
}

/** Visible text that is cut off by an overflow:hidden/clip ancestor (its own box or a parent's). Intentional text-overflow:ellipsis is ignored. */
export async function checkClipping(page: Page, root = 'body'): Promise<CheckResult> {
  return page.evaluate((rootSel) => {
    const failures: string[] = []
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
    }
    const label = (el: Element) => `${el.tagName.toLowerCase()}:${((el as HTMLElement).innerText || '').trim().slice(0, 24).replace(/\s+/g, ' ')}`
    const clips = (v: string) => v === 'hidden' || v === 'clip'
    const scope = document.querySelector(rootSel) ?? document.body
    for (const el of scope.querySelectorAll('*')) {
      if (!visible(el)) continue
      if (!([...el.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim()))) continue
      if (el.closest('canvas,svg')) continue
      const er = el.getBoundingClientRect()
      // Own box: text wider/taller than its own clipped box.
      const s = getComputedStyle(el)
      if (s.textOverflow !== 'ellipsis' && !s.webkitLineClamp?.toString().match(/^[1-9]/) && s.display !== 'inline') {
        if (clips(s.overflowX) && el.scrollWidth > el.clientWidth + 1) failures.push(`text wider than its box ${label(el)} (${el.scrollWidth}>${el.clientWidth})`)
        else if (clips(s.overflowY) && el.scrollHeight > el.clientHeight + 1) failures.push(`text taller than its box ${label(el)} (${el.scrollHeight}>${el.clientHeight})`)
      }
      // Ancestor clip: the element's box pokes outside a clipping ancestor, hiding part of the text.
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const ps = getComputedStyle(p)
        if (!clips(ps.overflowX) && !clips(ps.overflowY)) continue
        const pr = p.getBoundingClientRect()
        const cutX = clips(ps.overflowX) && (er.left < pr.left - 2 || er.right > pr.right + 2)
        const cutY = clips(ps.overflowY) && (er.top < pr.top - 2 || er.bottom > pr.bottom + 2)
        if ((cutX || cutY) && pr.width > 0 && pr.height > 0) {
          // Only a failure if the clipped part is a meaningful share of the element (ignores decorative bleed).
          const ix = Math.max(0, Math.min(er.right, pr.right) - Math.max(er.left, pr.left)), iy = Math.max(0, Math.min(er.bottom, pr.bottom) - Math.max(er.top, pr.top))
          const shown = (ix * iy) / (er.width * er.height)
          if (shown < 0.95 && shown > 0) failures.push(`clipped by ${p.tagName.toLowerCase()} (${Math.round((1 - shown) * 100)}% hidden) ${label(el)}`)
          break
        }
      }
    }
    return { failures: [...new Set(failures)], skipped: [] }
  }, root)
}

/** Gameplay content is on screen: a scene root or canvas of nonzero size exists AND the rendered frame is not blank
 *  (a downsampled screenshot has more than a handful of distinct colours). */
export async function checkGameplayVisible(page: Page, rootSelector = '[data-stage-screen],[data-scene],canvas'): Promise<CheckResult> {
  const failures: string[] = []
  const roots = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map(e => { const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) } }), rootSelector)
  if (!roots.length) failures.push(`no element matches ${rootSelector}`)
  else if (!roots.some(r => r.w > 0 && r.h > 0)) failures.push(`scene root has zero size: ${JSON.stringify(roots)}`)
  const shot = (await page.screenshot()).toString('base64')
  const colours = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode()
    const c = document.createElement('canvas'); c.width = 48; c.height = 48
    const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0, 48, 48)
    const d = x.getImageData(0, 0, 48, 48).data; const set = new Set<number>()
    for (let i = 0; i < d.length; i += 4) set.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4))
    return set.size
  }, shot)
  if (colours <= 3) failures.push(`frame looks blank (${colours} distinct colours)`)
  return { failures, skipped: [] }
}

/** Structural findings as data (same rules as helpers.expectSound), for the evidence index and the self-test. */
export async function collectStructural(page: Page): Promise<{ small: string[]; taps: string[]; overlaps: string[]; hscroll: boolean }> {
  return page.evaluate(() => {
    const out = { small: [] as string[], taps: [] as string[], overlaps: [] as string[], hscroll: document.documentElement.scrollWidth > innerWidth + 1 }
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
    for (const b of buttons) { const r = b.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) out.taps.push(`${Math.round(r.width)}x${Math.round(r.height)} ${label(b)}`) }
    for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i], b = buttons[j]
      if (a.contains(b) || b.contains(a)) continue
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      if (ra.height > 150 || rb.height > 150) continue
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (w > 4 && h > 4) out.overlaps.push(`${label(a)} x ${label(b)}`)
    }
    for (const k of ['small', 'taps', 'overlaps'] as const) out[k] = [...new Set(out[k])]
    return out
  })
}
