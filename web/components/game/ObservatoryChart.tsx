'use client'

/**
 * ObservatoryChart — PixiJS lightcurve renderer for the live classification
 * screen (TessDiscoveryScreen). Replaces the old Recharts/SVG LightcurvePlot,
 * which rendered as a generic dashboard line chart instead of the game's
 * Observatory console (per Landnam.html): nebula sky behind a dense,
 * dip-depth-coloured scatter.
 *
 * Interaction model (drag-to-select — marks how *wide* a dip is, not just
 * a single point):
 *   pointerdown  → start drag, record anchor x
 *   pointermove  → draw live selection rectangle between anchor and cursor
 *   pointerup    → commit the range [x1, x2] via onRange(x1, x2)
 *   tap (< 6px drag) on an existing range → remove it via onRemoveRange(index)
 */

import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { LightcurvePoint } from '@/components/game/LightcurvePlot'
import type { TransitRange } from '@/lib/data'

// Warm nebula sky, dialed back on blue: the flux scatter reads as pale
// lavender→violet→amber rather than saturated cyan, and the sky leans on
// purple/rust/amber with only a faint cool accent (not a blue wash).
const SKY_BASE   = 0x0a0810
const SKY_PURPLE = 0x5a3a8a
const SKY_VIOLET = 0x3a2a52
const SKY_RUST   = 0x7a2a44
const SKY_AMBER  = 0x9a5210
const MARK_COLOR = 0xf5a623
const GRID_COLOR = 0x8c7fa0
const TICK_COLOR = 0x8c7c8e
const LINE_COLOR = 0xbfaee0
const DOT_LO     = 0xb8a4e0  // shallow dip — pale lavender, not cyan
const DOT_MID    = 0x9d6fd6  // mid dip — violet
const DOT_HI     = 0xf5a623  // deep dip — amber

function lerpChannel(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t)
}
function dipColor(frac: number): number {
  const c = Math.max(0, Math.min(1, frac))
  return c < 0.5 ? lerpChannel(DOT_LO, DOT_MID, c / 0.5) : lerpChannel(DOT_MID, DOT_HI, (c - 0.5) / 0.5)
}
function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PAD_LEFT = 44, PAD_RIGHT = 10, PAD_TOP = 10, PAD_BOT = 26

export interface ObservatoryChartProps {
  points:        LightcurvePoint[]
  ranges:        TransitRange[]
  onRange:       (x1: number, x2: number) => void
  onRemoveRange: (index: number) => void
  locked?:       boolean
  height?:       number
  // Fixed [yMin, yMax] to render against, instead of auto-scaling to
  // whichever points[] slice is currently visible. Sector windowing passes
  // a handful of points at a time; auto-scaling each sector to its own
  // min/max stretches pure noise to fill the whole chart height every time
  // (Liam, 2026-07-03: "I still do not see a lightcurve" — scattered dots,
  // no visible curve, because every ~44-point slice renormalized to noise).
  // Pass the full candidate's range so only the sector that actually
  // contains the dip looks dramatic; the rest read as a flat, real curve.
  yDomain?:      [number, number]
}

export default function ObservatoryChart({ points, ranges, onRange, onRemoveRange, locked = false, height, yDomain }: ObservatoryChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const pointsRef = useRef(points); pointsRef.current = points
  const yDomainRef = useRef(yDomain); yDomainRef.current = yDomain
  const rangesRef = useRef(ranges); rangesRef.current = ranges
  const onRangeRef = useRef(onRange); onRangeRef.current = onRange
  const onRemoveRef = useRef(onRemoveRange); onRemoveRef.current = onRemoveRange
  const lockedRef = useRef(locked); lockedRef.current = locked

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;position:absolute;inset:0;touch-action:none;'
    canvas.dataset.testid = 'observatory-chart-canvas'
    host.appendChild(canvas)

    const app = new Application()
    let destroyed = false
    let rafId = 0
    let W = 0, H = 0

    const bgG = new Graphics()
    const gridG = new Graphics()
    const scanG = new Graphics()
    const dataG = new Graphics()
    const rangeG = new Graphics()
    const selG = new Graphics()
    const labelsC = new Container()
    const scanStart = performance.now()

    let dragActive = false
    let dragAnchorPx = 0
    let dragCurPx = 0

    function xForData(dx: number, xMin: number, xMax: number, plotW: number) {
      return PAD_LEFT + ((dx - xMin) / (xMax - xMin)) * plotW
    }
    function dataForX(px: number, xMin: number, xMax: number, plotW: number) {
      return xMin + ((Math.max(PAD_LEFT, Math.min(PAD_LEFT + plotW, px)) - PAD_LEFT) / plotW) * (xMax - xMin)
    }

    function handleDown(e: PointerEvent) {
      if (lockedRef.current) return
      const pts = pointsRef.current
      if (!pts.length) return
      const rect = canvas.getBoundingClientRect()
      const px = (e.clientX - rect.left) * (W / rect.width)
      if (px < PAD_LEFT || px > W - PAD_RIGHT) return
      canvas.setPointerCapture(e.pointerId)
      dragActive = true
      dragAnchorPx = px
      dragCurPx = px
    }
    function handleMove(e: PointerEvent) {
      if (!dragActive) return
      const rect = canvas.getBoundingClientRect()
      dragCurPx = (e.clientX - rect.left) * (W / rect.width)
    }
    function handleUp(e: PointerEvent) {
      if (!dragActive) return
      dragActive = false
      const pts = pointsRef.current
      if (!pts.length) return
      const rect = canvas.getBoundingClientRect()
      const upPx = (e.clientX - rect.left) * (W / rect.width)
      const deltaPx = Math.abs(upPx - dragAnchorPx)
      const plotW = W - PAD_LEFT - PAD_RIGHT
      const xMin = pts[0].x, xMax = pts[pts.length - 1].x

      if (deltaPx < 6) {
        const tapX = dataForX(dragAnchorPx, xMin, xMax, plotW)
        const idx = rangesRef.current.findIndex(r => tapX >= Math.min(r.x1, r.x2) && tapX <= Math.max(r.x1, r.x2))
        if (idx !== -1) onRemoveRef.current(idx)
        selG.clear()
        return
      }

      const x1 = dataForX(dragAnchorPx, xMin, xMax, plotW)
      const x2 = dataForX(upPx, xMin, xMax, plotW)
      onRangeRef.current(Math.min(x1, x2), Math.max(x1, x2))
      selG.clear()
    }
    function handleCancel() {
      dragActive = false
      selG.clear()
    }
    canvas.addEventListener('pointerdown', handleDown)
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerup', handleUp)
    canvas.addEventListener('pointercancel', handleCancel)

    function redraw() {
      const pts = pointsRef.current
      if (!pts.length) return
      const plotW = W - PAD_LEFT - PAD_RIGHT
      const plotH = H - PAD_TOP - PAD_BOT
      const xMin = pts[0].x, xMax = pts[pts.length - 1].x
      const domain = yDomainRef.current
      const [yMin, yMax] = domain ?? (() => {
        const ys = pts.map(p => p.y)
        return [Math.min(...ys), Math.max(...ys)] as [number, number]
      })()
      const yRange = yMax - yMin || 1
      const toX = (dx: number) => xForData(dx, xMin, xMax, plotW)
      const toY = (dy: number) => PAD_TOP + (1 - (dy - yMin) / yRange) * plotH

      // ── Nebula sky (deterministic, no per-frame flicker) ──────────────────
      bgG.clear()
      bgG.rect(0, 0, W, H).fill(SKY_BASE)
      const soft = (cx: number, cy: number, r: number, color: number, maxAlpha: number) => {
        const steps = 6
        for (let i = steps; i >= 1; i--) bgG.circle(cx, cy, (r * i) / steps).fill({ color, alpha: (maxAlpha / steps) * 1.5 })
      }
      soft(W * 0.24, H * 0.08, W * 0.85, SKY_PURPLE, 0.34)
      soft(W * 0.88, H * 0.36, W * 0.6, SKY_VIOLET, 0.18)
      soft(W * 0.1, H * 0.7, W * 0.45, SKY_RUST, 0.2)
      soft(W * 0.5, H * 1.04, W * 1.05, SKY_AMBER, 0.36)
      // Kept plain white/dim and low-alpha on purpose — these are backdrop
      // decoration and must read as clearly *behind* the flux data, not
      // compete with it (see the alpha fix on dataG below for why this
      // matters: matching hues/sizes made real data invisible against it).
      const rng = mulberry32(11)
      for (let i = 0; i < 70; i++) {
        const sx = rng() * W, sy = rng() * H, sr = rng() * 0.8 + 0.25
        bgG.circle(sx, sy, sr).fill({ color: 0xffffff, alpha: 0.05 + rng() * 0.18 })
      }

      // ── Grid ────────────────────────────────────────────────────────────
      gridG.clear()
      const Y_TICKS = 4, X_TICKS = 5
      for (let i = 0; i <= Y_TICKS; i++) {
        const cy = PAD_TOP + (i / Y_TICKS) * plotH
        gridG.moveTo(PAD_LEFT, cy).lineTo(PAD_LEFT + plotW, cy).stroke({ color: GRID_COLOR, alpha: 0.08, width: 1 })
      }
      for (let i = 0; i <= X_TICKS; i++) {
        const cx = PAD_LEFT + (i / X_TICKS) * plotW
        gridG.moveTo(cx, PAD_TOP).lineTo(cx, PAD_TOP + plotH).stroke({ color: GRID_COLOR, alpha: 0.06, width: 1 })
      }

      // ── Scan sweep (telescope-scanning greeble, loops every ~5s) ────────
      scanG.clear()
      if (!lockedRef.current) {
        const elapsed = (performance.now() - scanStart) % 5000
        const t = elapsed / 5000
        const sx = PAD_LEFT + t * plotW
        scanG.rect(sx - 1, PAD_TOP, 2, plotH).fill({ color: LINE_COLOR, alpha: 0.16 })
        scanG.moveTo(sx, PAD_TOP).lineTo(sx, PAD_TOP + plotH).stroke({ color: LINE_COLOR, alpha: 0.35, width: 1 })
      }

      // ── Committed range fills (amber, dashed edges) ────────────────────
      rangeG.clear()
      labelsC.removeChildren()
      for (const r of rangesRef.current) {
        const rx1 = toX(Math.min(r.x1, r.x2))
        const rx2 = toX(Math.max(r.x1, r.x2))
        const rw = rx2 - rx1
        rangeG.rect(rx1, PAD_TOP, rw, plotH).fill({ color: MARK_COLOR, alpha: 0.2 })
        for (const ex of [rx1, rx2]) {
          for (let y = PAD_TOP; y < PAD_TOP + plotH; y += 6) {
            rangeG.moveTo(ex, y).lineTo(ex, Math.min(y + 3, PAD_TOP + plotH)).stroke({ color: MARK_COLOR, alpha: 0.85, width: 1.5 })
          }
        }
        if (rw > 20) {
          const dur = Math.abs(r.x2 - r.x1).toFixed(2)
          const lbl = new Text({ text: `${dur}d`, style: new TextStyle({ fontFamily: 'Oxanium, monospace', fontSize: 8, fill: MARK_COLOR, fontWeight: '700' }) })
          lbl.anchor.set(0.5, 1); lbl.x = rx1 + rw / 2; lbl.y = PAD_TOP - 2
          labelsC.addChild(lbl)
        }
      }

      // ── Live drag selection ──────────────────────────────────────────────
      selG.clear()
      if (dragActive) {
        const sx1 = Math.min(dragAnchorPx, dragCurPx)
        const sx2 = Math.max(dragAnchorPx, dragCurPx)
        if (sx2 - sx1 > 2) {
          selG.rect(sx1, PAD_TOP, sx2 - sx1, plotH).fill({ color: DOT_MID, alpha: 0.14 })
          selG.moveTo(sx1, PAD_TOP).lineTo(sx1, PAD_TOP + plotH).stroke({ color: DOT_MID, alpha: 0.7, width: 1 })
          selG.moveTo(sx2, PAD_TOP).lineTo(sx2, PAD_TOP + plotH).stroke({ color: DOT_MID, alpha: 0.7, width: 1 })
        }
      }

      // ── Flux scatter (dense, coloured by dip depth) ────────────────────
      // The line never actually rendered: this data is a uniformly-spaced
      // synthetic series (~44-220 points across the full plot width), so
      // consecutive points sit 10-90px apart on screen depending on width —
      // always past the old "gap > 8px" break threshold, which silently
      // treated *every* point as its own isolated 1-point run and skipped
      // it (only runs with length > 1 got stroked). There's no reason to
      // break the line at all for this dataset — draw one continuous path.
      dataG.clear()
      if (pts.length > 1) {
        dataG.moveTo(toX(pts[0].x), toY(pts[0].y))
        for (let i = 1; i < pts.length; i += 1) dataG.lineTo(toX(pts[i].x), toY(pts[i].y))
        dataG.stroke({ color: LINE_COLOR, alpha: 0.68, width: 1.4 })
      }
      for (const p of pts) {
        const frac = yRange > 0 ? (yMax - p.y) / yRange : 0
        dataG.circle(toX(p.x), toY(p.y), frac > 0.35 ? 2.1 : 1.7).fill({ color: dipColor(frac), alpha: 0.8 + 0.2 * frac })
      }

      // ── Axis labels ──────────────────────────────────────────────────────
      const tickStyle = new TextStyle({ fontFamily: 'Oxanium, monospace', fontSize: 8, fill: TICK_COLOR })
      for (let i = 0; i <= X_TICKS; i++) {
        const v = xMin + (i / X_TICKS) * (xMax - xMin)
        const cx = PAD_LEFT + (i / X_TICKS) * plotW
        const t = new Text({ text: v.toFixed(1), style: tickStyle })
        t.anchor.set(0.5, 0); t.x = cx; t.y = PAD_TOP + plotH + 5
        labelsC.addChild(t)
      }
      for (let i = 0; i <= Y_TICKS; i++) {
        const v = yMin + (i / Y_TICKS) * yRange
        const cy = PAD_TOP + (1 - i / Y_TICKS) * plotH
        const t = new Text({ text: v.toFixed(3), style: tickStyle })
        t.anchor.set(1, 0.5); t.x = PAD_LEFT - 6; t.y = cy
        labelsC.addChild(t)
      }
    }

    const doInit = async () => {
      try {
        const rect = host.getBoundingClientRect()
        W = Math.round(Math.max(200, rect.width))
        H = Math.round(height ?? Math.max(100, rect.height))
        const dpr = window.devicePixelRatio || 1
        await app.init({ canvas, width: W, height: H, background: SKY_BASE, antialias: true, autoDensity: true, resolution: dpr })
        if (destroyed) return
        app.stage.addChild(bgG, gridG, scanG, rangeG, selG, dataG, labelsC)
        redraw()
        app.ticker.add(() => redraw())
      } catch (err) {
        console.error('[ObservatoryChart] init failed:', err)
      }
    }
    rafId = requestAnimationFrame(() => doInit())

    return () => {
      cancelAnimationFrame(rafId)
      destroyed = true
      canvas.removeEventListener('pointerdown', handleDown)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerup', handleUp)
      canvas.removeEventListener('pointercancel', handleCancel)
      if (app.renderer) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
      }
      // Unconditional: gating this behind app.renderer left a dead, listener-
      // free canvas orphaned in the DOM whenever cleanup fired before the
      // rAF-deferred doInit() had finished initialising Pixi (e.g. React
      // StrictMode's dev-only mount -> cleanup -> remount cycle) — two
      // canvases then matched the same data-testid, and anything selecting
      // "the" chart canvas could grab the dead one instead of the live one.
      canvas.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

  return (
    <div
      ref={hostRef}
      data-testid="observatory-chart"
      style={{ position: 'relative', width: '100%', height: height ? `${height}px` : '100%', cursor: locked ? 'default' : 'crosshair' }}
    >
      {/* Decorative targeting reticle — ported from the telescope console
          reference (specs/design-references/telescopeobservatory-console-ui-reference-v0-mockup).
          zIndex above the canvas: the canvas is appended imperatively
          *after* this JSX renders, so without an explicit stacking order
          it would paint over (hide) this reticle. */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.35, zIndex: 1 }}>
        <div style={{ position: 'relative', width: 40, height: 40, border: '1px solid rgba(112,217,234,0.4)', borderRadius: '50%' }}>
          <span style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 1, background: 'rgba(112,217,234,0.4)', transform: 'translateY(-50%)' }} />
          <span style={{ position: 'absolute', left: '50%', top: 0, height: '100%', width: 1, background: 'rgba(112,217,234,0.4)', transform: 'translateX(-50%)' }} />
          <span style={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(112,217,234,0.6)', transform: 'translate(-50%, -50%)' }} />
        </div>
      </div>
    </div>
  )
}
