'use client'

import { useEffect, useRef, useState } from 'react'
import { ASSET_ROOT, GROUND, skyGrade } from '@/lib/scene/base-site'
import { lockedSky, type EarthBiomeId, type WorldTimeGrade } from '@/lib/scene/base-world'
import { skyAt, type LaunchCrew, type SkyState } from '@/lib/world/sky-calendar'
import { WORLD_SCENE, advance, applySky, createWorld, type Entity, type World } from '@/lib/world/world-sim'
import type { BaseCameraState } from '@/lib/scene/base-camera'
import styles from './BaseWorldCanvas.module.css'

interface Props {
  /** Points per kit unit. */
  px: number
  camera: BaseCameraState
  time: WorldTimeGrade
  biome: EarthBiomeId
  /** Launches from other pads can be tapped to show whose rocket it is (the Base). */
  launchTags?: boolean
  /** Ground line as a fraction of the height above the bottom edge. Defaults to the shared site value. */
  groundLine?: number
  /** Cosmetic extras forced into the sky (the earned Orionids shower). */
  extraSky?: readonly string[]
}

interface LaunchTag {
  id: string
  crew: LaunchCrew
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
export function BaseWorldCanvas({ px, camera, time, biome, launchTags = false, extraSky, groundLine = GROUND.lineFromBottom }: Props) {
  const extraSkyRef = useRef(extraSky)
  extraSkyRef.current = extraSky
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [tags, setTags] = useState<LaunchTag[]>([])
  const [openTag, setOpenTag] = useState<string | null>(null)
  const tagEls = useRef(new Map<string, HTMLButtonElement>())
  const tagsOn = useRef(launchTags)
  tagsOn.current = launchTags
  const worldRef = useRef<World | null>(null)
  const propsRef = useRef({ px, camera, time, biome, groundLine })
  propsRef.current = { px, camera, time, biome, groundLine }

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
    let tagKey = ''
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
      const view = { w: w / p.px, h: (h * (1 - p.groundLine)) / p.px, camX: p.camera.x, px: p.px }
      skyAge += dt
      if (!sky || skyAge > 1) {
        sky = skyAt(new Date(), p.time, p.biome, [...lockedSky(), ...(['dusk', 'night', 'dawn'].includes(p.time) ? extraSkyRef.current ?? [] : [])])
        skyAge = 0
      }
      applySky(world, sky, view, still ? 0 : dt)
      if (tagsOn.current) {
        const live = sky.events.filter(ev => ev.kind === 'launch' && ev.crew).map(ev => ({ id: ev.id, crew: ev.crew! }))
        const key = live.map(t => t.id).join('|')
        if (key !== tagKey) { tagKey = key; setTags(live) }
      }
      if (!still) carry = advance(world, dt, carry)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (loaded && revealStart < 0) revealStart = now
      const reveal = !loaded ? 0 : still ? 1 : Math.min(1, (now - revealStart) / 1000 / REVEAL_SECONDS)
      draw(ctx, world, sky, p, w, h, now / 1000, reveal)
      if (tagsOn.current) placeTags(world, p, h, reveal, tagEls.current)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelled = true; cancelAnimationFrame(raf) }
    // A new landscape is a new world: its own horizon, plants and drifts.
  }, [biome])

  // A tag whose launch has left the sky closes with it.
  useEffect(() => { if (openTag && !tags.some(t => t.id === openTag)) setOpenTag(null) }, [openTag, tags])

  const canvas = <canvas ref={canvasRef} className={styles.canvas} data-testid="base-world-canvas" data-time={time} data-biome={biome} aria-hidden="true" />
  if (!launchTags) return canvas
  return (
    <>
      {canvas}
      <div className={styles.tags}>
        {tags.map(tag => (
          <button
            key={tag.id}
            ref={el => { if (el) tagEls.current.set(tag.id, el); else tagEls.current.delete(tag.id) }}
            type="button"
            className={styles.tag}
            style={{ visibility: 'hidden' }}
            data-testid="sky-launch-tag"
            data-launch={tag.id}
            aria-expanded={openTag === tag.id}
            aria-label={`${tag.crew.pilot}'s ${tag.crew.rocket}`}
            onClick={() => setOpenTag(open => (open === tag.id ? null : tag.id))}
          >
            <span className={styles.ribbon} aria-hidden={openTag !== tag.id}>
              <span className={styles.ribbonPilot}>{tag.crew.pilot}</span>
              <span className={styles.ribbonMeta}>{tag.crew.rocket} · {tag.crew.mission}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

/** Keeps each launch's tap target on its rocket (the middle of the sprite, along its heading). */
function placeTags(world: World, p: Props, h: number, reveal: number, els: Map<string, HTMLButtonElement>) {
  if (els.size === 0) return
  const groundY = h * (1 - (p.groundLine ?? GROUND.lineFromBottom))
  const { x: camX, y: camY, zoom } = p.camera
  const seen = new Set<string>()
  for (const e of world.entities) {
    if (e.def.sprite !== 'far-rocket' || !e.event) continue
    const el = els.get(e.event)
    if (!el) continue
    const depth = e.def.depth ?? 1
    const k = p.px * zoom * e.scale
    const s = WORLD_SCENE.sprites['far-rocket' as keyof typeof WORLD_SCENE.sprites]
    const half = s ? (s.v0 + s.h / 2) * k : 0
    const x = camX * depth + e.x * p.px * zoom + Math.sin(e.heading) * half
    const y = camY * depth + (groundY - e.y * p.px) * zoom - Math.cos(e.heading) * half
    seen.add(e.event)
    el.style.transform = `translate(${x}px, ${y}px)`
    el.style.visibility = reveal > 0 && y > -22 ? 'visible' : 'hidden'
  }
  for (const [id, el] of els) if (!seen.has(id)) el.style.visibility = 'hidden'
}

function draw(ctx: CanvasRenderingContext2D, world: World, sky: SkyState, p: Props, w: number, h: number, t: number, reveal: number) {
  const { grade, gloom } = weatherGrade(skyGrade(p.time), sky.weather.kind)
  const groundY = h * (1 - (p.groundLine ?? GROUND.lineFromBottom))
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
    if (e.def.sprite && LAKE_PLAINS.has(e.def.sprite)) drawLake(ctx, e.def.sprite, sx, sy, px * z * e.scale, t)
    if (e.def.sprite === 'ground-complex') drawStrata(ctx, e.def.sprite, sx, sy, px * z * e.scale)
    else if (!e.def.sprite) drawShape(ctx, e, sx, sy, px * z, world, groundY, t, w)
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

/** SSL-834 (Liam, 13.11): the lake on the horizon is bigger and its water moves. Every plain image carries a thin
 *  strip of water along its top rows (about 2% to 14% of its height); the lake is redrawn over it, reaching about twice
 *  as far towards the base, with slow drifting glints. The ridges and dunes in front still overlap it. */
const LAKE_PLAINS = new Set(['steppe-plain', 'plain-desert', 'plain-tundra', 'plain-coast'])
const LAKE_TOP = 0.02
const LAKE_BOTTOM = 0.3
let lakeStill: boolean | null = null

function drawLake(ctx: CanvasRenderingContext2D, sprite: string, sx: number, sy: number, k: number, t: number) {
  const s = WORLD_SCENE.sprites[sprite as keyof typeof WORLD_SCENE.sprites]
  if (!s) return
  if (lakeStill === null) lakeStill = reducedMotion()
  const time = lakeStill ? 0 : t
  const left = sx + s.x0 * k
  const width = s.w * k
  const imageTop = sy - (s.v0 + s.h) * k
  const top = imageTop + s.h * k * LAKE_TOP
  const bottom = imageTop + s.h * k * LAKE_BOTTOM
  const depth = bottom - top
  const coast = sprite === 'plain-coast'
  const water = ctx.createLinearGradient(0, top, 0, bottom)
  water.addColorStop(0, coast ? '#8fb5cc' : '#b4c3cf')
  water.addColorStop(0.45, coast ? '#7aa6c2' : '#a2b6c7')
  water.addColorStop(1, coast ? '#6b98b6' : '#8ea7bb')
  ctx.save()
  ctx.fillStyle = water
  ctx.fillRect(left, top, width, depth)
  // Far shore: a soft dark line where the water meets the land behind it.
  ctx.fillStyle = 'rgb(60 78 92 / 22%)'
  ctx.fillRect(left, top, width, Math.max(1, k * 0.35))
  // Ripples: thin light dashes in rows, each row drifting at its own pace and fading in and out.
  const rows = 6
  const dash = Math.max(6, 9 * k)
  for (let r = 0; r < rows; r++) {
    const y = top + depth * (0.16 + (r / rows) * 0.78)
    const gap = dash * (3.2 + (r % 3))
    const speed = (4 + r * 1.7) * k * (r % 2 ? -1 : 1)
    const offset = ((time * speed) % gap + gap) % gap
    const alpha = 0.18 + 0.14 * Math.sin(time * 0.9 + r * 1.3)
    ctx.fillStyle = `rgb(240 247 252 / ${Math.max(0.05, alpha).toFixed(3)})`
    const h = Math.max(1, k * (0.28 + r * 0.06))
    for (let x = left - gap + offset + (r * dash) % gap; x < left + width; x += gap) ctx.fillRect(x, y, dash * (0.6 + 0.4 * ((r + 1) % 2)), h)
  }
  // Near shore: a pale lip of wet sand along the bottom edge.
  ctx.fillStyle = 'rgb(236 228 210 / 55%)'
  ctx.fillRect(left, bottom - Math.max(1, k * 0.4), width, Math.max(1, k * 0.4))
  ctx.restore()
}

/** The ground cut away under the apron's front edge: the soil and bedrock the Subsurface digs into, in its palette.
 *  It fills the foreground a tall screen leaves below the structure row, instead of bare paving. */
const STRATA: Array<{ depth: number; fill: string; edge: string }> = [
  { depth: 16, fill: '#756f60', edge: '#8a836f' },
  { depth: 20, fill: '#756b56', edge: '#59554b' },
  { depth: 26, fill: '#605b4d', edge: '#4e4b3f' },
  { depth: 9999, fill: '#575855', edge: '#4a4b48' },
]

function drawStrata(ctx: CanvasRenderingContext2D, sprite: string, sx: number, sy: number, k: number) {
  const s = WORLD_SCENE.sprites[sprite as keyof typeof WORLD_SCENE.sprites]
  if (!s) return
  const left = Math.floor(sx + s.x0 * k)
  const width = Math.ceil(s.w * k) + 1
  const top = Math.round(sy - s.v0 * k)
  const floor = top + 4000
  const step = Math.max(2, Math.round(4 * k))
  // A wavy, pixel-stepped seam between two layers, the same on every frame.
  const seam = (x: number, layer: number) => Math.round(Math.sin(x / (k * 23) + layer * 1.9) * 1.6 + Math.sin(x / (k * 9) + layer) * 0.8) * Math.max(1, Math.round(k))
  ctx.save()
  // The apron slab's cut face, lit on top with a shadow under it.
  ctx.fillStyle = '#a39d92'
  ctx.fillRect(left, top, width, Math.max(2, 3 * k))
  ctx.fillStyle = '#706c64'
  ctx.fillRect(left, top + Math.max(2, 3 * k), width, Math.max(1, k))
  let y = top + Math.max(3, 4 * k)
  STRATA.forEach((band, i) => {
    const bottom = Math.min(floor, y + band.depth * k)
    ctx.fillStyle = band.fill
    for (let x = left; x < left + width; x += step) {
      const from = i === 0 ? y : y + seam(x, i)
      const to = band.depth > 999 ? floor : bottom + seam(x, i + 1)
      ctx.fillRect(x, from, step, to - from)
    }
    if (band.depth < 999) {
      ctx.fillStyle = band.edge
      for (let x = left; x < left + width; x += step) ctx.fillRect(x, bottom + seam(x, i + 1), step, Math.max(1, k * 0.7))
    }
    y = bottom
  })
  // Pebbles and mineral pockets, scattered the same way every frame.
  const cell = 14 * k
  for (let gx = Math.floor(left / cell); gx * cell < left + width; gx++) {
    for (let gy = 0; gy < 18; gy++) {
      const hash = Math.abs(Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453) % 1
      if (hash > 0.42) continue
      const px = gx * cell + hash * cell * 2
      if (px < left || px > left + width) continue
      const py = top + 10 * k + gy * cell * 0.8 + ((hash * 7) % 1) * cell * 0.5
      ctx.fillStyle = hash < 0.06 ? '#a58d5e' : hash < 0.14 ? '#9a8d6d' : '#4e4b3f'
      ctx.fillRect(Math.round(px), Math.round(py), Math.max(2, Math.round((2 + hash * 5) * k)), Math.max(1, Math.round((1 + hash * 2) * k)))
    }
  }
  // Deeper ground falls into shade.
  const shade = ctx.createLinearGradient(0, top, 0, top + 160 * k)
  shade.addColorStop(0, 'rgb(20 22 26 / 0%)')
  shade.addColorStop(1, 'rgb(20 22 26 / 38%)')
  ctx.fillStyle = shade
  ctx.fillRect(left, top, width, floor - top)
  ctx.restore()
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
