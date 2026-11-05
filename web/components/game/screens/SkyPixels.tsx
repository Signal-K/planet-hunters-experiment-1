'use client'

import { useMemo } from 'react'

/**
 * Pixel art for the sky views, drawn the way the rest of the game draws: flat palette colours on a hard grid,
 * no gradients, blur or glow. One cell is one view unit (about 4px on a phone in landscape), so it sits next to
 * the kit sprites without looking like a different game. Pure functions of their inputs, cached by the caller.
 */

export interface PixelEarth { cx: number; cy: number; r: number }

function rng(seed0: number) {
  let s = seed0 >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

type Rgb = [number, number, number]
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const shade = (c: Rgb, k: number): Rgb => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)]

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const dither = (x: number, y: number) => (BAYER[y & 3][x & 3] + 0.5) / 16

function makeCanvas(w: number, h: number) {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Coverage mask of whatever `draw` paints, thresholded so every cell is wholly in or wholly out. */
function mask(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = makeCanvas(w, h)
  const ctx = c?.getContext('2d', { willReadFrequently: true })
  if (!c || !ctx) return new Uint8Array(w * h)
  ctx.fillStyle = '#000'
  draw(ctx)
  const data = ctx.getImageData(0, 0, w, h).data
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 127 ? 1 : 0
  return out
}

function blobPath(r: () => number, rad: number) {
  const n = 11
  const pts = Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; const rr = rad * (0.55 + r() * 0.6); return [Math.cos(a) * rr * 1.5, Math.sin(a) * rr * 0.55] as const })
  const p = new Path2D()
  p.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2)
  pts.forEach((q, k) => { const nx = pts[(k + 1) % n]; p.quadraticCurveTo(q[0], q[1], (q[0] + nx[0]) / 2, (q[1] + nx[1]) / 2) })
  p.closePath()
  return p
}

const OCEAN = ['#2f86d6', '#2468b8', '#1a4f98', '#133a78'].map(hex)
const RIM = [hex('#d6f4ff'), hex('#7ccbf4')]
const LAND = ['#4f9d3f', '#3f8f3a', '#5aa04a', '#35803a'].map(hex)

/** The visible slice of Earth: banded ocean, shallows, continents with desert, cloud streaks and a dithered night side. */
export function drawEarth(W: number, H: number, earth: PixelEarth): string {
  const w = Math.ceil(W)
  const h = Math.ceil(H)
  const c = makeCanvas(w, h)
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return ''
  const r = rng(23)
  const top = earth.cy - earth.r
  const blobs = Array.from({ length: 7 }, (_, i) => {
    const rad = W * (0.07 + r() * 0.09)
    const x = (i + 0.3 + r() * 0.4) * (W / 7)
    const y = top + 7 + r() * 30 + (Math.abs(x - earth.cx) / W) * 6
    return { path: blobPath(r, rad), x, y, rad, hue: i % LAND.length }
  })
  const clouds = Array.from({ length: 14 }, () => { const x = r() * W; return { x, y: top + 3 + r() * 40 + (Math.abs(x - earth.cx) / W) * 8, rx: 5 + r() * 14, ry: 0.7 + r() * 1.1, a: (-8 + r() * 16) * (Math.PI / 180) } })
  const cities = Array.from({ length: 34 }, () => ({ x: Math.floor(r() * W * 0.34), y: Math.floor(top + 5 + r() * 40) }))

  const shallows = mask(w, h, x => blobs.forEach(b => { x.save(); x.translate(b.x, b.y); x.scale(1.18, 1.3); x.fill(b.path); x.restore() }))
  const land = mask(w, h, x => blobs.forEach(b => { x.save(); x.translate(b.x, b.y); x.fill(b.path); x.restore() }))
  const desert = mask(w, h, x => blobs.forEach(b => { x.save(); x.translate(b.x + b.rad * 0.12, b.y + b.rad * 0.1); x.scale(0.45, 0.45); x.fill(b.path); x.restore() }))
  const cloud = mask(w, h, x => clouds.forEach(c0 => { x.beginPath(); x.ellipse(c0.x, c0.y, c0.rx, c0.ry, c0.a, 0, Math.PI * 2); x.fill() }))

  const img = ctx.createImageData(w, h)
  const cityKeys = new Set(cities.map(p => p.y * w + p.x))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - earth.cx, y + 0.5 - earth.cy)
      const depth = earth.r - d
      if (depth < 0) continue
      const i = y * w + x
      let col: Rgb
      if (depth < 1) col = RIM[0]
      else if (depth < 2) col = RIM[1]
      else if (cloud[i] && depth > 3) col = depth < 4.5 ? hex('#e9f4ff') : hex('#ffffff')
      else if (desert[i] && land[i]) col = (x + y) & 1 && depth < 40 ? hex('#c9a869') : hex('#b8955a')
      else if (land[i]) {
        const b = blobs.find(bl => Math.hypot(x - bl.x, y - bl.y) < bl.rad * 1.6)
        const base = LAND[(b?.hue ?? 0) % LAND.length]
        col = !land[i - w] ? shade(base, 1.18) : !land[i + w] ? shade(base, 0.7) : base
      } else if (shallows[i]) col = hex('#4fb8c8')
      else {
        const edges = [7, 18, 36]
        let band = depth < edges[0] ? 0 : depth < edges[1] ? 1 : depth < edges[2] ? 2 : 3
        // a two-cell dithered seam where one band meets the next
        const next = edges.findIndex(e => Math.abs(depth - e) < 1.2)
        if (next >= 0 && dither(x, y) > 0.5) band = next + (depth < edges[next] ? 1 : 0)
        col = OCEAN[Math.min(band, 3)]
      }
      // night falls on the left: a dithered ramp, then a solid dark side, with a few city lights
      const night = 1 - Math.min(1, x / (W * 0.3))
      if (night > 0 && dither(x, y) < night * 1.05) col = shade(col, 0.55)
      if (cityKeys.has(i) && night > 0.4 && depth > 6) col = hex('#ffd98a')
      const o = i * 4
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

/* ── the space telescope, as a sprite on the same grid ── */

const SW = 33
const SH = 20
const PIVOT = { x: 16.5, y: 12 }

function telescopeSprite() {
  const c = makeCanvas(SW, SH)
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return null
  const box = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h) }
  // wings: outlined solar panels with cell lines
  for (const x0 of [1, 21]) {
    box(x0, 9, 11, 6, '#10284f')
    box(x0 + 1, 10, 9, 4, '#2f6fc0')
    for (let k = 0; k < 9; k += 3) box(x0 + 1 + k, 10, 1, 4, '#7db4ee')
    box(x0 + 1, 11, 9, 1, '#4d8fd8')
  }
  box(12, 11, 1, 2, '#aab6c8'); box(20, 11, 1, 2, '#aab6c8')
  // bus
  box(12, 6, 9, 11, '#1c2a40')
  box(13, 7, 7, 9, '#e3eaf5')
  box(13, 7, 2, 9, '#a9b6cb')
  box(13, 14, 7, 2, '#e2b64e')
  box(13, 14, 7, 1, '#f3d27a')
  // four cameras on the front
  for (const x of [13, 15, 17, 19]) { box(x, 2, 1, 5, '#0d1424'); box(x, 1, 1, 1, '#9fd6e4') }
  box(12, 6, 9, 1, '#6c7b92')
  // high-gain dish
  box(22, 17, 4, 1, '#6c7b92'); box(23, 18, 3, 1, '#e6edf7')
  return c
}

/** The craft turned to `angle` degrees (clockwise from up), sampled nearest-neighbour so it stays on the pixel grid. */
export function drawTelescope(angle: number): { src: string; size: number; px: number; py: number } {
  const sprite = telescopeSprite()
  const size = 44
  const out = makeCanvas(size, size)
  const ctx = out?.getContext('2d')
  const sctx = sprite?.getContext('2d')
  if (!out || !ctx || !sprite || !sctx) return { src: '', size, px: size / 2, py: size / 2 }
  const src = sctx.getImageData(0, 0, SW, SH).data
  const img = ctx.createImageData(size, size)
  const a = (angle * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const mid = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - mid
      const dy = y + 0.5 - mid
      const sx = Math.floor(dx * cos + dy * sin + PIVOT.x)
      const sy = Math.floor(-dx * sin + dy * cos + PIVOT.y)
      if (sx < 0 || sy < 0 || sx >= SW || sy >= SH) continue
      const s = (sy * SW + sx) * 4
      if (src[s + 3] < 128) continue
      const o = (y * size + x) * 4
      img.data[o] = src[s]; img.data[o + 1] = src[s + 1]; img.data[o + 2] = src[s + 2]; img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return { src: out.toDataURL(), size, px: mid, py: mid }
}

/** A raster drawn on the view's grid, shown without smoothing. */
export function PixelImage({ href, x, y, w, h, testId }: { href: string; x: number; y: number; w: number; h: number; testId?: string }) {
  if (!href) return null
  return <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} data-testid={testId} />
}

export function useEarthImage(W: number, H: number, earth: PixelEarth) {
  return useMemo(() => drawEarth(W, H, earth), [W, H, earth.cx, earth.cy, earth.r]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useTelescopeImage(angle: number) {
  const step = Math.round(angle / 6) * 6
  return useMemo(() => ({ ...drawTelescope(step), step }), [step])
}

/** Square star: a single cell, or a plus when it is a bright one. Cells snap to the grid. */
export function PixelStar({ x, y, tone = '#ffffff', big = false, opacity = 1 }: { x: number; y: number; tone?: string; big?: boolean; opacity?: number }) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  return (
    <g fill={tone} opacity={opacity}>
      <rect x={cx} y={cy} width="1" height="1" />
      {big && (<><rect x={cx - 1} y={cy} width="1" height="1" /><rect x={cx + 1} y={cy} width="1" height="1" /><rect x={cx} y={cy - 1} width="1" height="1" /><rect x={cx} y={cy + 1} width="1" height="1" /></>)}
    </g>
  )
}

/* ── ground telescope: banded dusk sky, ridges, pines and the dome, all on the grid ── */

export interface PixelGround { horizon: number; dome: { x: number; y: number } }

const SKY = ['#050a1e', '#08122c', '#0c1c40', '#12294f', '#1c3a62', '#3b4f6e', '#6e5d6a'].map(hex)

export function drawGround(W: number, H: number, geom: PixelGround, portrait: boolean): string {
  const w = Math.ceil(W)
  const h = Math.ceil(H)
  const c = makeCanvas(w, h)
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return ''
  const r = rng(5)
  const { horizon, dome } = geom
  const put = (x: number, y: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1) }
  const box = (x: number, y: number, bw: number, bh: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), bw, bh) }

  // sky: seven flat bands, two-cell dithered seams
  const bandH = horizon / SKY.length
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const f = y / bandH
      let b = Math.min(SKY.length - 1, Math.floor(f))
      const frac = f - Math.floor(f)
      if (frac > 0.9 && dither(x, y) > 0.5 && b < SKY.length - 1) b += 1
      const col = SKY[b]
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
  // stars, only where there is sky
  const nStars = portrait ? 80 : 120
  for (let i = 0; i < nStars; i++) {
    const x = Math.floor(r() * w)
    const y = Math.floor(r() * (horizon - 6))
    const t = r()
    put(x, y, t < 0.15 ? '#ffd9a8' : t < 0.35 ? '#bcd4ff' : '#ffffff')
    if (r() > 0.93) { put(x - 1, y, '#9fb4e0'); put(x + 1, y, '#9fb4e0'); put(x, y - 1, '#9fb4e0'); put(x, y + 1, '#9fb4e0') }
  }
  // two ridges and the hill the dome stands on
  const ridge = (base: number, amp: number, freq: number, phase: number, col: string, lit?: string) => {
    for (let x = 0; x < w; x++) {
      const y = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x * freq + phase)) - amp * 0.3 * Math.sin(x * freq * 2.3 + phase * 1.7))
      box(x, y, 1, h - y, col)
      if (lit) put(x, y, lit)
    }
  }
  ridge(horizon - 3, 9, 0.018, 0.6, '#16253a', '#223752')
  ridge(horizon, 6, 0.027, 2.1, '#0b1522', '#14233a')
  ridge(horizon + 3, 3, 0.012, 4, '#03060b')
  // pines: stacked rows
  const trees = Array.from({ length: portrait ? 12 : 26 }, () => ({ x: Math.floor(r() * w), h: 4 + Math.floor(r() * 6) }))
  trees.forEach(t => {
    if (Math.abs(t.x - dome.x) < 14) return
    for (let row = 0; row < t.h; row++) box(t.x - Math.floor(row / 3), horizon + 2 - t.h + row, 1 + 2 * Math.floor(row / 3), 1, '#02040a')
    box(t.x, horizon + 2, 1, 1, '#02040a')
  })
  // the observatory: a white dome with a dark slit, an annex with lit windows, a mast with a red light
  const dx = Math.round(dome.x)
  const dy = Math.round(dome.y)
  box(dx - 13, dy - 1, 26, 9, '#1d2f47'); box(dx - 12, dy, 24, 8, '#0a111c')
  for (let row = 0; row < 11; row++) {
    const half = Math.round(Math.sqrt(Math.max(0, 11 * 11 - (11 - row) * (11 - row))))
    const y = dy - 12 + row + 1
    box(dx - half - 1, y, half * 2 + 2, 1, '#20324a')
    box(dx - half, y, half * 2, 1, '#c9d3df')
    box(dx - half, y, Math.min(3, half * 2), 1, '#e8eef5')
    box(dx + Math.max(0, half - 3), y, Math.min(3, half), 1, '#8fa0b4')
  }
  box(dx - 1, dy - 12, 3, 11, '#0a111c')
  box(dx + 14, dy + 1, 13, 7, '#0a111c'); box(dx + 14, dy + 1, 13, 1, '#1d2f47')
  box(dx + 17, dy + 3, 2, 2, '#ffd98a'); box(dx + 22, dy + 3, 2, 2, '#ffd98a')
  box(dx - 26, dy - 10, 2, 18, '#0a111c'); box(dx - 26, dy - 12, 2, 2, '#ff4d4d')
  return c.toDataURL()
}

/* ── Saturn: banded globe, shaded by dithering, with rings that pass in front and behind ── */

export interface PixelSaturn { cx: number; cy: number; R: number; tilt: number; k: number }

const SAT_BANDS = ['#c8ab74', '#e9d5a2', '#b8935a', '#ecd9aa', '#c9a869', '#e4cd9a', '#a98456', '#8a6a3e'].map(hex)
const RING_BANDS: [number, number, string][] = [
  [1.24, 1.52, '#7a6446'], [1.52, 1.72, '#e6d1a3'], [1.72, 1.78, '#b59c70'], [1.78, 1.94, '#efdcb0'],
  [2.03, 2.27, '#c4ad80'], [2.31, 2.35, '#e8dcc0'],
].map(([a, b, col]) => [a as number, b as number, col as string])

export function drawSaturn(W: number, H: number, s: PixelSaturn): string {
  const w = Math.ceil(W)
  const h = Math.ceil(H)
  const c = makeCanvas(w, h)
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return ''
  const img = ctx.createImageData(w, h)
  const t = (-s.tilt * Math.PI) / 180
  const ct = Math.cos(t)
  const st = Math.sin(t)
  const ringBands = RING_BANDS.map(([a, b, col]) => [a, b, hex(col)] as [number, number, Rgb])
  const light = { x: s.cx - s.R * 0.45, y: s.cy - s.R * 0.5 }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const dxp = px - s.cx
      const dyp = py - s.cy
      const dist = Math.hypot(dxp, dyp)
      // ring-plane coordinates
      const u = (dxp * ct - dyp * st) / s.R
      const v = (dxp * st + dyp * ct) / (s.R * s.k)
      const m = Math.hypot(u, v)
      let col: Rgb | null = null
      const ring = ringBands.find(([a, b]) => m >= a && m < b)
      const inPlanet = dist < s.R
      if (ring && !inPlanet) {
        col = ring[2]
        if (v < 0 && m > 1.52 && m < 1.94 && ((x + y) & 3) === 0) col = shade(col, 0.88)
      }
      if (inPlanet) {
        const lat = dyp / s.R
        const wob = Math.sin(dxp * 0.11 + lat * 9) * 0.035
        const bi = Math.min(SAT_BANDS.length - 1, Math.max(0, Math.floor((lat + 1 + wob) * 0.5 * SAT_BANDS.length)))
        let base = SAT_BANDS[bi]
        const seam = ((lat + 1 + wob) * 0.5 * SAT_BANDS.length) % 1
        if (seam > 0.82 && dither(x, y) > 0.5 && bi < SAT_BANDS.length - 1) base = SAT_BANDS[bi + 1]
        const lit = 1 - Math.min(1, Math.hypot(px - light.x, py - light.y) / (s.R * 1.7))
        const k = 0.5 + lit * 0.62 + (dither(x, y) - 0.5) * 0.1
        const level = k > 0.92 ? 1 : k > 0.74 ? 0.8 : k > 0.58 ? 0.62 : 0.46
        col = shade(base, level)
        if (dist > s.R - 1) col = shade(base, 0.4)
        // the ring's shadow lies across the planet's southern face, and the front ring crosses it
        if (v > 0 && ring) col = ring[2]
        else if (Math.abs(lat - 0.02) < 0.05 && dxp * ct + dyp * st > -s.R) col = shade(col, 0.6)
      }
      if (!col) continue
      const o = (y * w + x) * 4
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

/** The Saturn orbiter probe: a dish on a boxy bus with two boom arms, on the grid. */
export function drawProbe(): { src: string; w: number; h: number } {
  const w = 28
  const h = 24
  const c = makeCanvas(w, h)
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return { src: '', w, h }
  const box = (x: number, y: number, bw: number, bh: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, bw, bh) }
  box(1, 15, 6, 3, '#4d5560'); box(21, 15, 6, 3, '#4d5560')
  box(9, 13, 10, 9, '#0c1a2e'); box(10, 14, 8, 7, '#c4cdd8'); box(10, 14, 8, 2, '#e9c46a')
  // dish
  for (let row = 0; row < 8; row++) { const half = 3 + row; box(14 - half, 12 - row, half * 2, 1, row === 7 ? '#0c1a2e' : '#e4e9ef') }
  box(13, 3, 2, 10, '#0c1a2e'); box(13, 4, 1, 9, '#8fa0b4')
  return { src: c.toDataURL(), w, h }
}

export function useGroundImage(W: number, H: number, geom: PixelGround, portrait: boolean) {
  return useMemo(() => drawGround(W, H, geom, portrait), [W, H, geom.horizon, geom.dome.x, geom.dome.y, portrait]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useSaturnImage(W: number, H: number, s: PixelSaturn) {
  return useMemo(() => drawSaturn(W, H, s), [W, H, s.cx, s.cy, s.R, s.tilt, s.k]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useProbeImage() {
  return useMemo(() => drawProbe(), [])
}
