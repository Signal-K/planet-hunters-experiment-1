'use client'

import { useEffect, useRef } from 'react'
import { ASSET_ROOT, GROUND, skyGrade } from '@/lib/scene/base-site'
import { lockedSky, type EarthBiomeId, type WorldTimeGrade } from '@/lib/scene/base-world'
import { skyAt, type SkyState } from '@/lib/world/sky-calendar'
import { WORLD_SCENE, advance, applySky, createWorld, type Entity, type World } from '@/lib/world/world-sim'
import type { BaseCameraState } from '@/lib/scene/base-camera'
import styles from './BaseWorldCanvas.module.css'

interface Props {
  /** Points per kit unit. */
  px: number
  camera: BaseCameraState
  time: WorldTimeGrade
  biome: EarthBiomeId
}

const images = new Map<string, HTMLImageElement>()
function image(src: string): HTMLImageElement | null {
  let img = images.get(src)
  if (!img) {
    img = new Image()
    img.src = `${ASSET_ROOT}${src}`
    images.set(src, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

/** Every sprite the world can draw. Loaded together so the scene appears as one piece instead of popping in. */
let preloaded: Promise<void> | null = null
function preloadAll(): Promise<void> {
  if (preloaded) return preloaded
  const srcs = new Set<string>(Object.values(WORLD_SCENE.sprites).map(s => s.src))
  const loads = [...srcs].map(src => {
    const img = images.get(src) ?? Object.assign(new Image(), { src: `${ASSET_ROOT}${src}` })
    images.set(src, img)
    return img.decode ? img.decode().catch(() => undefined) : Promise.resolve()
  })
  // A missing asset must not hold the scene back forever.
  const timeout = new Promise<void>(resolve => setTimeout(resolve, 5000))
  preloaded = Promise.race([Promise.all(loads).then(() => undefined), timeout])
  return preloaded
}

/** How much the weather hides the sky: 0 clear, 1 storm. Drives the gradient, the sun and the stars. */
const GLOOM: Record<string, number> = { clear: 0, windy: 0.15, cloudy: 0.45, fog: 0.5, rain: 0.8, storm: 1 }
const OVERCAST = { top: '#667585', mid: '#8d9aa5', horizon: '#b4bcc2' }

function mixHex(a: string, b: string, k: number): string {
  const n = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  const c = (i: number) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * k).toString(16).padStart(2, '0')
  return `#${c(0)}${c(1)}${c(2)}`
}

/** The time-of-day grade, pulled toward overcast grey by the weather (less so at night, when it just loses stars). */
function weatherGrade(g: ReturnType<typeof skyGrade>, kind: string): { grade: ReturnType<typeof skyGrade>; gloom: number } {
  const gloom = GLOOM[kind] ?? 0
  if (gloom === 0) return { grade: g, gloom }
  const dark = g.shade > 0.3 ? 0.35 : 1
  const k = gloom * 0.75 * dark
  return {
    gloom,
    grade: {
      ...g,
      top: mixHex(g.top, OVERCAST.top, k),
      mid: mixHex(g.mid, OVERCAST.mid, k),
      horizon: mixHex(g.horizon, OVERCAST.horizon, k),
      stars: g.stars * (1 - gloom),
    },
  }
}

const REVEAL_SECONDS = 0.6

const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Renders the base world (SSL-423): every background piece is an entity from shared/scenes/base-world.json, stepped
 * by the world sim and drawn here in layer order with camera parallax. Sky events from the calendar spawn their
 * own objects (meteors, rain, lightning, a launch on the range, a weather balloon, satellites, aurora, comets).
 * Structures and controls stay in the DOM on top. Native draws the same world with SwiftUI Canvas.
 */
export function BaseWorldCanvas({ px, camera, time, biome }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const worldRef = useRef<World | null>(null)
  const propsRef = useRef({ px, camera, time, biome })
  propsRef.current = { px, camera, time, biome }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    worldRef.current = createWorld('base', biome)
    const world = worldRef.current
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __baseWorld?: World }).__baseWorld = world
    let raf = 0
    let last = performance.now()
    let carry = 0
    let sky: SkyState | null = null
    let skyAge = Infinity
    const still = reducedMotion()
    let revealStart = -1
    let loaded = false
    let cancelled = false
    void preloadAll().then(() => { if (!cancelled) loaded = true })

    const frame = (now: number) => {
      const p = propsRef.current
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const view = { w: w / p.px, h: (h * (1 - GROUND.lineFromBottom)) / p.px, camX: p.camera.x, px: p.px }
      skyAge += dt
      if (!sky || skyAge > 1) {
        sky = skyAt(new Date(), p.time, p.biome, lockedSky())
        skyAge = 0
      }
      applySky(world, sky, view, still ? 0 : dt)
      if (!still) carry = advance(world, dt, carry)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (loaded && revealStart < 0) revealStart = now
      const reveal = !loaded ? 0 : still ? 1 : Math.min(1, (now - revealStart) / 1000 / REVEAL_SECONDS)
      draw(ctx, world, sky, p, w, h, now / 1000, reveal)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelled = true; cancelAnimationFrame(raf) }
    // A new landscape is a new world: its own horizon, plants and drifts.
  }, [biome])

  return <canvas ref={canvasRef} className={styles.canvas} data-testid="base-world-canvas" data-time={time} data-biome={biome} aria-hidden="true" />
}

function draw(ctx: CanvasRenderingContext2D, world: World, sky: SkyState, p: Props, w: number, h: number, t: number, reveal: number) {
  const { grade, gloom } = weatherGrade(skyGrade(p.time), sky.weather.kind)
  const groundY = h * (1 - GROUND.lineFromBottom)
  const { x: camX, y: camY, zoom } = p.camera
  const px = p.px
  // Sky gradient, top to horizon.
  const g = ctx.createLinearGradient(0, 0, 0, groundY)
  g.addColorStop(0, grade.top)
  g.addColorStop(0.55, grade.mid)
  g.addColorStop(1, grade.horizon)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // The authored paving sprite ends before the viewport does on tall screens.
  // Continue it as textured, marked concrete instead of a flat colour band.
  const apron = ctx.createLinearGradient(0, groundY, 0, h)
  apron.addColorStop(0, GROUND.deep)
  apron.addColorStop(1, mixHex(GROUND.deep, '#263544', 0.28))
  ctx.fillStyle = apron
  ctx.fillRect(0, groundY, w, h - groundY)
  drawApronContinuation(ctx, groundY, w, h, px)
  if (grade.stars > 0) drawStars(ctx, w, groundY, grade.stars, t)
  drawMilkyWay(ctx, w, groundY, grade.stars, t)
  drawLuminary(ctx, grade, sky, w, groundY, px, t, gloom)
  drawHorizonGlow(ctx, grade, w, groundY, gloom)

  const entities = world.entities.slice().sort((a, b) => (a.def.layer ?? 0) - (b.def.layer ?? 0))
  const weather = sky.weather.kind
  const overcast = weather === 'rain' || weather === 'storm'
  for (const e of reveal > 0 ? entities : []) {
    const depth = e.def.depth ?? 1
    const screenSpace = !!e.def.sky
    const z = screenSpace ? 1 : zoom
    const sx = camX * depth + e.x * px * z
    const sy = (screenSpace ? 0 : camY * depth) + (groundY - e.y * px) * z
    const cloud = !!e.def.sprite?.startsWith('cloud')
    ctx.globalAlpha = reveal * e.alpha * (cloud ? grade.clouds * sky.weather.clouds : 1)
    if (cloud && overcast) ctx.filter = weather === 'storm' ? 'brightness(0.55)' : 'brightness(0.78)'
    if (e.def.sprite) drawSprite(ctx, e, sx, sy, px * z * e.scale)
    else drawShape(ctx, e, sx, sy, px * z, world, groundY, t, w)
    ctx.filter = 'none'
  }
  ctx.globalAlpha = 1
  // Night and dusk darken the whole world evenly; lightning lifts it for a moment.
  if (grade.shade > 0) {
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = grade.shade
    ctx.fillStyle = grade.top
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }
  if (world.flash > 0) {
    ctx.globalAlpha = world.flash * 0.28
    ctx.fillStyle = '#f2f6ff'
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1
  }
}

function drawApronContinuation(ctx: CanvasRenderingContext2D, groundY: number, w: number, h: number, px: number) {
  const row = Math.max(26, 18 * px)
  ctx.save()
  ctx.strokeStyle = 'rgb(49 65 74 / 24%)'
  ctx.lineWidth = 1
  for (let y = groundY + row; y < h; y += row) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke()
  }
  for (let x = -row; x < w + row; x += row * 1.65) {
    ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + row * 0.3, h); ctx.stroke()
  }
  ctx.fillStyle = 'rgb(223 230 227 / 20%)'
  const dashY = groundY + Math.min(44 * px, (h - groundY) * 0.42)
  for (let x = 24 * px; x < w; x += 56 * px) ctx.fillRect(x, dashY, 24 * px, Math.max(1, px * 0.65))
  ctx.restore()
}

function drawSprite(ctx: CanvasRenderingContext2D, e: Entity, sx: number, sy: number, k: number) {
  const s = WORLD_SCENE.sprites[e.def.sprite as keyof typeof WORLD_SCENE.sprites]
  if (!s) return
  const img = image(s.src)
  if (!img) return
  const left = sx + s.x0 * k
  const top = sy - (s.v0 + s.h) * k
  if (e.heading) {
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(e.heading)
    ctx.drawImage(img, s.x0 * k, -(s.v0 + s.h) * k, s.w * k, s.h * k)
    ctx.restore()
    return
  }
  ctx.drawImage(img, left, top, s.w * k, s.h * k)
}

function drawShape(ctx: CanvasRenderingContext2D, e: Entity, sx: number, sy: number, k: number, world: World, groundY: number, t: number, w: number) {
  const d = e.def
  ctx.fillStyle = d.colour ?? '#ffffff'
  ctx.strokeStyle = d.colour ?? '#ffffff'
  ctx.lineCap = 'round'
  const speed = Math.hypot(e.vx, e.vy) || 1
  if (d.shape === 'streak' || d.shape === 'line') {
    const len = (d.length ?? 10) * k
    const ex = sx - (e.vx / speed) * len
    const ey = sy + (e.vy / speed) * len
    const grad = ctx.createLinearGradient(sx, sy, ex, ey)
    grad.addColorStop(0, d.colour ?? '#fff')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = Math.max(1, (d.width ?? 1) * (d.shape === 'streak' ? 1.4 : 1))
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
    if (d.shape === 'streak') { ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill() }
  } else if (d.shape === 'puff' || d.shape === 'dot') {
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.8, (d.radius ?? 1) * k * e.scale), 0, Math.PI * 2); ctx.fill()
    if (d.shape === 'dot') {
      ctx.globalAlpha *= 0.35
      ctx.beginPath(); ctx.arc(sx, sy, (d.radius ?? 1) * k * 2.4, 0, Math.PI * 2); ctx.fill()
    }
  } else if (d.shape === 'bolt') {
    // Jagged fork from the cloud base down to the horizon, fixed by the bolt's seed.
    const bottom = groundY - 56 * k
    let x = sx
    let y = sy
    let s = e.seed * 1000
    ctx.lineWidth = d.width ?? 2
    ctx.shadowColor = '#cfe0ff'
    ctx.shadowBlur = 12
    ctx.beginPath(); ctx.moveTo(x, y)
    while (y < bottom) {
      s = (s * 9301 + 49297) % 233280
      x += ((s / 233280) - 0.5) * 18
      y += 10 + (s / 233280) * 10
      ctx.lineTo(x, Math.min(y, bottom))
    }
    ctx.stroke()
    ctx.shadowBlur = 0
  } else if (d.shape === 'bank') {
    const bw = 260 * k
    const bh = (d.height ?? 20) * k
    const grad = ctx.createLinearGradient(0, sy - bh, 0, sy)
    grad.addColorStop(0, 'rgba(228,235,240,0)')
    grad.addColorStop(1, d.colour ?? '#e4ebf0')
    ctx.fillStyle = grad
    ctx.fillRect(sx - bw / 2, sy - bh, bw, bh)
  } else if (d.shape === 'ribbon') {
    // Aurora: soft curtains along a slow wave across the whole sky.
    const top = sy - (d.height ?? 40) * k
    for (let i = 0; i < 46; i += 1) {
      const x = (i / 45) * w
      const wave = Math.sin(i * 0.35 + t * 0.4 + e.seed * 6) * 12 * k / 2
      const grad = ctx.createLinearGradient(0, top + wave, 0, sy + wave)
      grad.addColorStop(0, 'rgba(160,120,220,0)')
      grad.addColorStop(0.45, 'rgba(127,224,200,0.55)')
      grad.addColorStop(1, 'rgba(127,224,200,0)')
      ctx.fillStyle = grad
      ctx.fillRect(x, top + wave, w / 45 + 1, sy - top)
    }
  } else if (d.shape === 'comet') {
    const len = (d.length ?? 40) * k
    const grad = ctx.createLinearGradient(sx, sy, sx + len, sy - len * 0.35)
    grad.addColorStop(0, 'rgba(238,246,255,0.9)')
    grad.addColorStop(1, 'rgba(238,246,255,0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + len, sy - len * 0.35); ctx.stroke()
    ctx.beginPath(); ctx.arc(sx, sy, (d.radius ?? 2) * k / 2 + 1, 0, Math.PI * 2); ctx.fill()
  }
  void world
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, groundY: number, alpha: number, t: number) {
  const tints = ['#f4f8fb', '#cfe0ff', '#fff1d6']
  let s = 7
  for (let i = 0; i < 160; i += 1) {
    s = (s * 16807) % 2147483647
    const x = (s % 10000) / 10000 * w
    s = (s * 16807) % 2147483647
    const y = (s % 10000) / 10000 * groundY * 0.8
    const bright = i % 11 === 0
    const tw = 0.6 + 0.4 * Math.sin(t * (bright ? 1.1 : 1.7) + i)
    const a = alpha * tw * (bright ? 1 : i % 5 === 0 ? 0.85 : 0.55) * (1 - (y / groundY) * 0.7)
    ctx.fillStyle = tints[i % 3]
    ctx.globalAlpha = a
    const size = bright ? 2.4 : i % 7 === 0 ? 2 : 1.2
    ctx.fillRect(x, y, size, size)
    if (bright) {
      // A soft cross flare on the brightest few.
      ctx.globalAlpha = a * 0.35
      ctx.fillRect(x - 4, y + size / 2 - 0.4, size + 8, 0.8)
      ctx.fillRect(x + size / 2 - 0.4, y - 4, 0.8, size + 8)
    }
  }
  ctx.globalAlpha = 1
}

/** A faint diagonal band of dust and unresolved stars, only once the sky is dark. */
function drawMilkyWay(ctx: CanvasRenderingContext2D, w: number, groundY: number, stars: number, t: number) {
  if (stars < 0.6) return
  ctx.save()
  ctx.translate(w * 0.5, groundY * 0.3)
  ctx.rotate(-0.42)
  const len = Math.max(w, groundY) * 0.9
  const g = ctx.createLinearGradient(0, -groundY * 0.2, 0, groundY * 0.2)
  g.addColorStop(0, 'rgba(190,205,255,0)')
  g.addColorStop(0.5, `rgba(205,215,255,${0.1 * stars})`)
  g.addColorStop(1, 'rgba(190,205,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(-len / 2, -groundY * 0.2, len, groundY * 0.4)
  let s = 311
  ctx.fillStyle = '#e8eeff'
  for (let i = 0; i < 70; i += 1) {
    s = (s * 16807) % 2147483647
    const x = ((s % 10000) / 10000 - 0.5) * len
    s = (s * 16807) % 2147483647
    const y = (((s % 10000) / 10000 - 0.5) * groundY * 0.22)
    ctx.globalAlpha = stars * 0.35 * (0.6 + 0.4 * Math.sin(t * 1.3 + i))
    ctx.fillRect(x, y, 1, 1)
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

/** Warm (or cool, at night) light pooling on the horizon under the luminary. */
function drawHorizonGlow(ctx: CanvasRenderingContext2D, grade: ReturnType<typeof skyGrade>, w: number, groundY: number, gloom: number) {
  const x = grade.luminary.x * w
  const night = grade.luminary.kind === 'moon'
  const reach = w * (night ? 0.45 : 0.6)
  const g = ctx.createRadialGradient(x, groundY, 0, x, groundY, reach)
  g.addColorStop(0, night ? `rgba(160,185,230,${0.16 * (1 - gloom)})` : `rgba(255,214,150,${0.32 * (1 - gloom)})`)
  g.addColorStop(1, 'rgba(255,214,150,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, groundY - reach, w, reach)
}

function drawLuminary(ctx: CanvasRenderingContext2D, grade: ReturnType<typeof skyGrade>, sky: SkyState, w: number, groundY: number, px: number, t: number, gloom: number) {
  // Behind cloud the disc is a dim smear: no rays, a soft halo, much less light.
  const veil = 1 - gloom * 0.85
  ctx.save()
  ctx.globalAlpha = veil
  const x = grade.luminary.x * w
  const y = grade.luminary.y * groundY
  const isSun = grade.luminary.kind === 'sun'
  const r = (isSun ? 8 : 6) * px
  const solar = sky.events.some(e => e.kind === 'eclipse-solar')
  const lunar = sky.events.some(e => e.kind === 'eclipse-lunar')
  // Low suns redden; the rest are warm white.
  const low = isSun && y > groundY * 0.5
  const core = isSun ? (low ? '#ffd9a0' : '#fff7dc') : lunar ? '#b5674f' : '#f3f1e6'
  const glow = isSun ? (low ? '255,170,110' : '255,226,160') : lunar ? '200,110,80' : '190,210,255'

  // Wide atmospheric halo.
  const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * (isSun ? 7 : 5))
  halo.addColorStop(0, `rgba(${glow},${isSun ? 0.5 : 0.28})`)
  halo.addColorStop(0.4, `rgba(${glow},${isSun ? 0.16 : 0.09})`)
  halo.addColorStop(1, `rgba(${glow},0)`)
  ctx.fillStyle = halo
  ctx.beginPath(); ctx.arc(x, y, r * (isSun ? 7 : 5), 0, Math.PI * 2); ctx.fill()

  if (isSun && gloom < 0.3) {
    // Slowly turning rays.
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(t * 0.03)
    for (let i = 0; i < 12; i += 1) {
      ctx.rotate(Math.PI / 6)
      const len = r * (i % 2 ? 2.6 : 3.6)
      const g = ctx.createLinearGradient(r, 0, len, 0)
      g.addColorStop(0, `rgba(${glow},0.35)`)
      g.addColorStop(1, `rgba(${glow},0)`)
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.1); ctx.lineTo(len, 0); ctx.lineTo(r * 0.9, r * 0.1); ctx.fill()
    }
    ctx.restore()
  }

  // Disc with limb shading so it reads as a sphere, not a flat circle.
  const disc = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r)
  disc.addColorStop(0, '#ffffff')
  disc.addColorStop(0.6, core)
  disc.addColorStop(1, isSun ? (low ? '#f3a56a' : '#f8d98a') : '#c9cdd8')
  ctx.fillStyle = disc
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()

  if (!isSun) {
    ctx.save()
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip()
    // Maria and craters.
    ctx.fillStyle = 'rgba(120,128,150,0.28)'
    const marks: Array<[number, number, number]> = [[-0.3, -0.25, 0.32], [0.25, -0.1, 0.24], [-0.05, 0.38, 0.2], [0.4, 0.35, 0.13], [-0.45, 0.2, 0.12]]
    for (const [mx, my, mr] of marks) { ctx.beginPath(); ctx.arc(x + mx * r, y + my * r, mr * r, 0, Math.PI * 2); ctx.fill() }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = Math.max(0.6, r * 0.04)
    for (const [mx, my, mr] of marks.slice(2)) { ctx.beginPath(); ctx.arc(x + mx * r, y + my * r, mr * r * 0.7, 0, Math.PI * 2); ctx.stroke() }
    if (!lunar) {
      // Phase: the unlit side keeps a faint earthshine, so the stars behind it are not erased.
      ctx.fillStyle = 'rgba(14,21,40,0.84)'
      ctx.beginPath(); ctx.arc(x + r * 0.5, y - r * 0.2, r * 0.95, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  if (isSun && solar) {
    ctx.fillStyle = '#1b2433'
    ctx.beginPath(); ctx.arc(x + r * 0.18, y - r * 0.08, r * 0.98, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
