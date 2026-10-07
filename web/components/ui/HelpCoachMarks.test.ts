import { describe, expect, it } from 'vitest'
import { placeBubble } from './HelpCoachMarks'

const overlaps = (h: { top: number; left: number; width: number; height: number }, p: { top?: number; bottom?: number; left: number; width: number }, vh: number) => {
  const top = p.top ?? vh - (p.bottom ?? 0) - 147
  return !(p.left + p.width <= h.left || p.left >= h.left + h.width || top + 147 <= h.top || top >= h.top + h.height)
}

describe('placeBubble', () => {
  it('goes below a small target', () => {
    const hole = { top: 100, left: 50, width: 100, height: 60 }
    expect(overlaps(hole, placeBubble(hole, 390, 844, 340), 844)).toBe(false)
  })
  it('sits beside a target that fills the height (landscape and desktop)', () => {
    for (const [vw, vh, hole] of [[844, 390, { top: 100, left: 239, width: 418, height: 291 }], [1280, 800, { top: 115, left: 231, width: 758, height: 633 }]] as const) {
      const p = placeBubble(hole, vw, vh, 340)
      expect(overlaps(hole, p, vh)).toBe(false)
      expect(p.left).toBeGreaterThanOrEqual(0)
      expect(p.left + p.width).toBeLessThanOrEqual(vw)
    }
  })
})
