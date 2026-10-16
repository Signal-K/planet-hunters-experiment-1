import { describe, expect, it } from 'vitest'
import { BASE_CAMERA_HOME, clampCamera, focusOn, inertiaStep, softClampCamera, zoomAt } from './base-camera'

const view = { w: 1000, h: 500 }

describe('base camera', () => {
  it('cannot pan at the whole-base zoom', () => {
    expect(clampCamera({ x: -300, y: 40, zoom: 1 }, view)).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('clamps zoom and keeps the world covering the view', () => {
    const c = clampCamera({ x: -99999, y: -99999, zoom: 9 }, view)
    expect(c.zoom).toBeLessThanOrEqual(2.6)
    expect(c.x).toBeCloseTo(view.w * (1 - c.zoom))
  })

  it('zooms about the cursor so the point under it stays put', () => {
    const p = { x: 600, y: 200 }
    const start = zoomAt(BASE_CAMERA_HOME, 1.5, { x: 500, y: 250 }, view)
    const next = zoomAt(start, 2, p, view)
    const worldBefore = { x: (p.x - start.x) / start.zoom, y: (p.y - start.y) / start.zoom }
    const worldAfter = { x: (p.x - next.x) / next.zoom, y: (p.y - next.y) / next.zoom }
    expect(worldAfter.x).toBeCloseTo(worldBefore.x)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y)
  })

  it('soft clamp overshoots a little but never more than the soft edge', () => {
    const c = softClampCamera({ x: 900, y: 0, zoom: 2 }, view)
    expect(c.x).toBeGreaterThan(0)
    expect(c.x).toBeLessThan(view.w * 0.08)
  })

  it('inertia decays to rest and stops at the edge', () => {
    let cam = { x: -100, y: 0, zoom: 2 }
    let vel = { x: 2, y: 0 }
    for (let i = 0; i < 400; i++) {
      const s = inertiaStep(cam, vel, 16, view)
      cam = s.cam; vel = s.vel
      if (!s.moving) break
    }
    expect(cam.x).toBeLessThanOrEqual(0)
    expect(Math.hypot(vel.x, vel.y)).toBeLessThan(0.05)
  })

  it('focus centres a structure when zoomed in, bounded by the world', () => {
    const c = focusOn({ x: 500, y: 250 }, 2, view)
    expect(c.x).toBeCloseTo(-500)
    expect(focusOn({ x: 0, y: 0 }, 2, view).x).toBe(0)
  })
})
