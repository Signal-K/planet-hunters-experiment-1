'use client'

import { useEffect, useRef } from 'react'
import { flightBodySpec, type FlightBodyInput, type FlightBodyKind } from '@/lib/flight-body'
import type { LaserPalette } from '@/lib/mining/laserPalette'
import styles from './FlightScene.module.css'

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 1831565813) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rgb(n: number): [number, number, number] {
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, t))
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ]
}

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, step: number, color: [number, number, number]) {
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  ctx.fillRect(x, y, step, step)
}

function paintAsteroid(ctx: CanvasRenderingContext2D, size: number, palette: LaserPalette, rand: () => number) {
  const lobes = 10
  const radii = Array.from({ length: lobes }, () => 0.28 + rand() * 0.16)
  const craters = Array.from({ length: 6 }, () => ({
    x: (rand() - 0.5) * 0.42,
    y: (rand() - 0.5) * 0.38,
    r: 0.045 + rand() * 0.07,
  }))
  const deep = rgb(palette.groundDeep)
  const mid = rgb(palette.ground)
  const ridge = rgb(palette.nearRidge)
  const lit = rgb(palette.groundSpeck)
  const far = rgb(palette.distant)
  const body = mix(ridge, lit, 0.62)
  const shadow = mix(deep, mid, 0.4)
  const step = 2
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const dx = (x + step / 2) / size - 0.5
      const dy = (y + step / 2) / size - 0.5
      const ang = Math.atan2(dy, dx)
      const u = (ang + Math.PI) / (Math.PI * 2)
      const i = u * lobes
      const i0 = Math.floor(i) % lobes
      const i1 = (i0 + 1) % lobes
      const f = i - Math.floor(i)
      const radius = radii[i0] * (1 - f) + radii[i1] * f
      const dist = Math.hypot(dx, dy)
      if (dist > radius) continue
      let light = 0.72 - dx * 1.05 - dy * 0.4
      let crater = false
      for (const c of craters) {
        const cd = Math.hypot(dx - c.x, dy - c.y)
        if (cd < c.r) {
          crater = true
          light -= 0.5 * (1 - cd / c.r)
        } else if (cd < c.r * 1.35) {
          light += 0.16
        }
      }
      const speck = rand() > 0.93
      let color = mix(shadow, body, Math.max(0, Math.min(1, (light - 0.2) / 0.75)))
      if (dist > radius * 0.88) color = mix(color, far, 0.55)
      if (crater) color = mix(deep, shadow, 0.35)
      else if (light > 0.95) color = mix(color, lit, 0.62)
      if (speck && !crater) color = mix(color, lit, 0.4)
      fill(ctx, x, y, step, color)
    }
  }
}

function insideDisc(dx: number, dy: number, radius: number): boolean {
  return dx * dx + dy * dy <= radius * radius
}

function paintDisc(
  ctx: CanvasRenderingContext2D,
  size: number,
  paint: (dx: number, dy: number, light: number) => [number, number, number] | null,
) {
  const step = 2
  const radius = 0.44
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const dx = (x + step / 2) / size - 0.5
      const dy = (y + step / 2) / size - 0.5
      if (!insideDisc(dx, dy, radius)) continue
      const light = 0.7 - dx * 0.9 - dy * 0.35
      const color = paint(dx, dy, light)
      if (color) fill(ctx, x, y, step, color)
    }
  }
}

function paintSphere(ctx: CanvasRenderingContext2D, size: number, palette: LaserPalette, rand: () => number, icy: boolean) {
  const deep = rgb(palette.groundDeep)
  const mid = rgb(palette.ground)
  const lit = rgb(icy ? palette.nearRidge : palette.groundSpeck)
  const shade = rgb(palette.distant)
  const spots = Array.from({ length: icy ? 4 : 5 }, () => ({
    x: (rand() - 0.5) * 0.5,
    y: (rand() - 0.5) * 0.5,
    r: 0.05 + rand() * 0.08,
  }))
  paintDisc(ctx, size, (dx, dy, light) => {
    let color = mix(shade, mid, Math.max(0, Math.min(1, light)))
    if (light > 0.95) color = mix(color, lit, 0.55)
    for (const spot of spots) {
      if (Math.hypot(dx - spot.x, dy - spot.y) < spot.r) color = mix(color, deep, 0.65)
    }
    return color
  })
}

function paintBands(ctx: CanvasRenderingContext2D, size: number, palette: LaserPalette) {
  const bands = (palette.planet?.bands?.length ? palette.planet.bands : [palette.ground, palette.nearRidge, palette.groundDeep, palette.groundSpeck])
    .map(rgb)
  paintDisc(ctx, size, (dx, dy, light) => {
    const band = bands[Math.abs(Math.floor((dy + 0.44) / 0.1)) % bands.length]
    const shaded = mix(band, rgb(palette.distant), Math.max(0, 0.45 - light))
    return dx > 0.18 ? mix(shaded, rgb(palette.groundDeep), 0.35) : shaded
  })
}

function cssColor(canvas: HTMLCanvasElement, name: string): [number, number, number] {
  const probe = document.createElement('span')
  probe.style.color = getComputedStyle(canvas).getPropertyValue(name).trim()
  probe.style.display = 'none'
  canvas.appendChild(probe)
  const parsed = getComputedStyle(probe).color
  probe.remove()
  const match = parsed.match(/(\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return [31, 120, 193]
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function paintEarth(ctx: CanvasRenderingContext2D, size: number, canvas: HTMLCanvasElement, rand: () => number) {
  const sea = cssColor(canvas, '--flight-sea')
  const land = cssColor(canvas, '--flight-land')
  const cloud = cssColor(canvas, '--flight-cloud')
  const ice = cssColor(canvas, '--flight-ice')
  const shade = cssColor(canvas, '--flight-shade')
  const lands = Array.from({ length: 4 }, () => ({
    x: (rand() - 0.5) * 0.46,
    y: (rand() - 0.5) * 0.4,
    rx: 0.08 + rand() * 0.1,
    ry: 0.05 + rand() * 0.08,
  }))
  paintDisc(ctx, size, (dx, dy, light) => {
    let color = mix(shade, sea, Math.max(0, Math.min(1, light)))
    if (dy < -0.32 || dy > 0.32) color = mix(color, ice, 0.65)
    for (const blob of lands) {
      const nx = (dx - blob.x) / blob.rx
      const ny = (dy - blob.y) / blob.ry
      if (nx * nx + ny * ny < 1) color = land
    }
    if (Math.sin(dx * 18 + dy * 8) > 0.72 && light > 0.4) color = mix(color, cloud, 0.7)
    if (dx > 0.2) color = mix(color, shade, 0.4)
    return color
  })
}

function paint(canvas: HTMLCanvasElement, kind: FlightBodyKind, palette: LaserPalette, seed: string) {
  const size = 96
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = false
  const rand = mulberry32(hash(seed))
  if (kind === 'asteroid') paintAsteroid(ctx, size, palette, rand)
  else if (kind === 'bands') paintBands(ctx, size, palette)
  else if (kind === 'earth') paintEarth(ctx, size, canvas, rand)
  else paintSphere(ctx, size, palette, rand, kind === 'ice')
}

export function FlightBody({ target, returning }: { target: FlightBodyInput; returning: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const spec = flightBodySpec(target, returning)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    paint(canvas, spec.kind, spec.palette, spec.seed)
  }, [spec.kind, spec.palette, spec.seed])

  return <canvas ref={ref} className={styles.bodyCanvas} data-testid="transit-destination" data-body={spec.kind} data-palette={spec.kind === 'earth' ? 'earth' : spec.palette.id} />
}
