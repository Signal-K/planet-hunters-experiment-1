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
    worldRef.current = worldRef.current ?? createWorld('base')
    const world = worldRef.current
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __baseWorld?: World }).__baseWorld = world
    let raf = 0
    let last = performance.now()
    let carry = 0
    let sky: SkyState | null = null
    let skyAge = Infinity
    const still = reducedMotion()

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
      draw(ctx, world, sky, p, w, h, now / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} data-testid="base-world-canvas" data-time={time} data-biome={biome} aria-hidden="true" />
}

function draw(ctx: CanvasRenderingContext2D, world: World, sky: SkyState, p: Props, w: number, h: number, t: number) {
  const grade = skyGrade(p.time)
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
  // Below the ground line the paving continues past the ground image.
  ctx.fillStyle = GROUND.deep
  ctx.fillRect(0, groundY, w, h - groundY)
  if (grade.stars > 0) drawStars(ctx, w, groundY, grade.stars, t)
  drawLuminary(ctx, grade, sky, w, groundY, px)

  const entities = world.entities.slice().sort((a, b) => (a.def.layer ?? 0) - (b.def.layer ?? 0))
  const weather = sky.weather.kind
  const overcast = weather === 'rain' || weather === 'storm'
  for (const e of entities) {
    const depth = e.def.depth ?? 1
    const screenSpace = !!e.def.sky
    const z = screenSpace ? 1 : zoom
    const sx = camX * depth + e.x * px * z
    const sy = (screenSpace ? 0 : camY * depth) + (groundY - e.y * px) * z
    const cloud = !!e.def.sprite?.startsWith('cloud')
    ctx.globalAlpha = e.alpha * (cloud ? grade.clouds * sky.weather.clouds : 1)
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
  ctx.fillStyle = '#f4f8fb'
  let s = 7
  for (let i = 0; i < 90; i += 1) {
    s = (s * 16807) % 2147483647
    const x = (s % 10000) / 10000 * w
    s = (s * 16807) % 2147483647
    const y = (s % 10000) / 10000 * groundY * 0.72
    const tw = 0.6 + 0.4 * Math.sin(t * 1.7 + i)
    ctx.globalAlpha = alpha * tw * (i % 5 === 0 ? 1 : 0.6)
    ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1.2, i % 7 === 0 ? 2 : 1.2)
  }
  ctx.globalAlpha = 1
}

function drawLuminary(ctx: CanvasRenderingContext2D, grade: ReturnType<typeof skyGrade>, sky: SkyState, w: number, groundY: number, px: number) {
  const x = grade.luminary.x * w
  const y = grade.luminary.y * groundY
  const r = (grade.luminary.kind === 'sun' ? 7 : 5) * px
  const solar = sky.events.some(e => e.kind === 'eclipse-solar')
  const lunar = sky.events.some(e => e.kind === 'eclipse-lunar')
  ctx.fillStyle = grade.luminary.kind === 'moon' && lunar ? '#b5674f' : '#fbf8ef'
  ctx.globalAlpha = 0.25
  ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  if (grade.luminary.kind === 'sun' && solar) {
    ctx.fillStyle = '#1b2433'
    ctx.beginPath(); ctx.arc(x + r * 0.18, y - r * 0.08, r * 0.98, 0, Math.PI * 2); ctx.fill()
  }
  if (grade.luminary.kind === 'moon' && !lunar) {
    // Crescent: bite out of the moon in the sky colour.
    ctx.fillStyle = grade.top
    ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.9, 0, Math.PI * 2); ctx.fill()
  }
}
