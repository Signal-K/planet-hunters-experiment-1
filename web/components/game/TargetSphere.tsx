'use client'

// SSL-317: lit, slowly rotating pixel sphere of a target body, drawn from the
// same `sampleSurface` biome model takeon uses for the voxel field, so what the
// player sees on approach is the world they land on. Rendering is cel-shaded
// (three light bands, no gradients) to match the chunky faceted art direction.
//
// The biome texture is sampled once per (target, lifeStage) into a small
// equirectangular map; each frame only rotates and lights it, so the sphere
// stays cheap on phones.
//
// Life is animated (decided 2026-09-19, SSL-317): a blooming body shows its
// living biomes spreading out from the warm lowlands and pulling back, and a
// thriving body shimmers. Both are per-texel colour swaps on the same map, so
// they cost nothing extra on sterile or dormant bodies. `prefers-reduced-motion`
// freezes the sphere at full bloom and stops the rotation.

import { useEffect, useMemo, useRef } from 'react'
import {
  BIOME_META,
  DIVISION_LAT_BANDS,
  DIVISION_LON_SECTORS,
  HABITABILITY_LABELS,
  LIFE_STAGE_LABELS,
  habitabilityForTarget,
  sampleSurface,
  type LifeStage,
  type SurfaceTarget,
} from '@/lib/data'
import { ownerLabel, type BodyOwnership } from '@/lib/systems/OwnershipSystem'
import styles from './TargetSphere.module.css'

const TEX_W = 128
const TEX_H = 64
/** Internal render size; CSS scales it up with pixelated sampling. */
const RENDER_PX = 96
const FRAME_MS = 90
const ROTATION_PER_MS = (Math.PI * 2) / 24_000

interface Texture {
  /** RGB per texel at the requested life stage, row-major from the north pole. */
  rgb: Uint8ClampedArray
  /** RGB per texel before life took hold (the dormant palette). */
  latentRgb: Uint8ClampedArray
  /** 1 where the texel is a living biome at this stage. */
  living: Uint8Array
  /**
   * 0..1 order in which living texels bloom: warm lowlands first, cold ridges
   * last. Compared against `bloomProgress` each frame.
   */
  front: Float32Array
  /** Number of living texels; 0 means nothing to animate. */
  livingCount: number
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

/** Slow breathing front for a blooming body; a thriving body is fully bloomed. */
export function bloomProgress(stage: LifeStage, t: number): number {
  if (stage === 'thriving') return 1
  if (stage !== 'blooming') return 0
  // 0.35..0.75 over an 8 s cycle: life visibly spreads, then eases back.
  return 0.55 + 0.2 * Math.sin((t / 8000) * Math.PI * 2)
}

/** Brightness multiplier for a living texel: a shimmer that travels along the bloom front. */
export function lifePulse(t: number, front: number): number {
  return 1 + 0.08 * Math.sin((t / 2400) * Math.PI * 2 + front * 5)
}

function buildTexture(target: SurfaceTarget, lifeStage: LifeStage): Texture {
  const count = TEX_W * TEX_H
  const rgb = new Uint8ClampedArray(count * 3)
  const latentRgb = new Uint8ClampedArray(count * 3)
  const living = new Uint8Array(count)
  const front = new Float32Array(count)
  const colorCache = new Map<string, [number, number, number]>()
  const colorFor = (key: string): [number, number, number] => {
    let c = colorCache.get(key)
    if (!c) { c = hexToRgb(key); colorCache.set(key, c) }
    return c
  }
  const animated = lifeStage === 'blooming' || lifeStage === 'thriving'
  let livingCount = 0
  for (let y = 0; y < TEX_H; y++) {
    const lat = Math.PI / 2 - ((y + 0.5) / TEX_H) * Math.PI
    for (let x = 0; x < TEX_W; x++) {
      const lon = -Math.PI + ((x + 0.5) / TEX_W) * Math.PI * 2
      const sample = sampleSurface(target, lat, lon, lifeStage)
      const meta = BIOME_META[sample.biome]
      const low = sample.elevation < 0.42
      const c = colorFor(low ? meta.shade : meta.color)
      const i = y * TEX_W + x
      rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]
      // Latent palette: the same texel with life switched off. Only sampled
      // on animated stages; sterile/dormant bodies never touch it.
      const latent = animated ? sampleSurface(target, lat, lon, 'dormant') : sample
      const lm = BIOME_META[latent.biome]
      const lc = latent === sample ? c : colorFor(low ? lm.shade : lm.color)
      latentRgb[i * 3] = lc[0]; latentRgb[i * 3 + 1] = lc[1]; latentRgb[i * 3 + 2] = lc[2]
      const isLiving = animated && (latent.biome !== sample.biome || meta.lifeCapacity >= 2)
      if (isLiving) {
        living[i] = 1
        livingCount++
        // Warm, low ground blooms first; cold ridges last.
        front[i] = Math.min(1, Math.max(0, (1 - sample.temperature) * 0.7 + sample.elevation * 0.3))
      }
    }
  }
  return { rgb, latentRgb, living, front, livingCount }
}

/** Quantised cel lighting: lit, mid, shadow. */
function celBand(dot: number): number {
  if (dot > 0.55) return 1
  if (dot > 0.15) return 0.78
  return 0.5
}

interface LifeFrame {
  /** Living texels with `front` below this are drawn in their living colour. */
  progress: number
  /** Clock for the shimmer, ms. */
  t: number
}

function paint(ctx: CanvasRenderingContext2D, tex: Texture, rotation: number, showDivisions: boolean, life: LifeFrame) {
  const size = RENDER_PX
  const image = ctx.createImageData(size, size)
  const data = image.data
  const r = size / 2 - 1
  const c = size / 2
  // Light from upper-left, slightly toward the viewer.
  const lx = -0.55, ly = 0.6, lz = 0.58
  const lonStep = (Math.PI * 2) / DIVISION_LON_SECTORS
  const latStep = Math.PI / DIVISION_LAT_BANDS
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = (px + 0.5 - c) / r
      const ny = (c - py - 0.5) / r
      const d2 = nx * nx + ny * ny
      const o = (py * size + px) * 4
      if (d2 > 1) { data[o + 3] = 0; continue }
      const nz = Math.sqrt(1 - d2)
      const lat = Math.asin(ny)
      let lon = Math.atan2(nx, nz) + rotation
      lon = ((lon + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
      const tx = Math.min(TEX_W - 1, Math.floor(((lon + Math.PI) / (Math.PI * 2)) * TEX_W))
      const ty = Math.min(TEX_H - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * TEX_H))
      const ti = ty * TEX_W + tx
      let light = celBand(nx * lx + ny * ly + nz * lz)
      // Rim darkening keeps the silhouette crisp against the void.
      if (d2 > 0.9) light *= 0.7
      let boundary = false
      if (showDivisions) {
        const lonInSector = ((lon + Math.PI) % lonStep + lonStep) % lonStep
        const latInBand = ((lat + Math.PI / 2) % latStep + latStep) % latStep
        boundary = lonInSector < 0.035 || lonInSector > lonStep - 0.035 || latInBand < 0.03 || latInBand > latStep - 0.03
      }
      let k = boundary ? light * 0.45 : light
      let src = tex.rgb
      if (tex.living[ti]) {
        const bloomed = tex.front[ti] <= life.progress
        if (bloomed) k *= lifePulse(life.t, tex.front[ti])
        else src = tex.latentRgb
      }
      data[o] = src[ti * 3] * k
      data[o + 1] = src[ti * 3 + 1] * k
      data[o + 2] = src[ti * 3 + 2] * k
      data[o + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
}

export interface TargetSphereProps {
  target: SurfaceTarget & { name: string }
  lifeStage: LifeStage
  ownership?: BodyOwnership
  /** CSS size of the sphere in px. */
  size?: number
  /** Hide the division/owner legend (compact placements). */
  compact?: boolean
  /** Copy shown above the body name, e.g. "ON APPROACH". */
  eyebrow?: string
}

export default function TargetSphere({ target, lifeStage, ownership, size = 160, compact = false, eyebrow = 'TARGET BODY' }: TargetSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const texture = useMemo(() => buildTexture(target, lifeStage), [target, lifeStage])
  const habitability = habitabilityForTarget(target).habitability
  const biomeIds = useMemo(() => {
    const ids = new Set<string>()
    ownership?.divisions.forEach(d => d.division.biomeMix.forEach(m => ids.add(m.biome)))
    return [...ids].slice(0, 6)
  }, [ownership])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      // One still frame at full bloom: the stage still reads, nothing moves.
      paint(ctx, texture, 0, !compact, { progress: lifeStage === 'blooming' || lifeStage === 'thriving' ? 1 : 0, t: 0 })
      return
    }
    let frame = 0
    let last = 0
    const tick = (t: number) => {
      if (t - last >= FRAME_MS) {
        const rotation = (t * ROTATION_PER_MS) % (Math.PI * 2)
        paint(ctx, texture, rotation, !compact, { progress: bloomProgress(lifeStage, t), t })
        last = t
      }
      frame = window.requestAnimationFrame(tick)
    }
    paint(ctx, texture, 0, !compact, { progress: bloomProgress(lifeStage, 0), t: 0 })
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [compact, lifeStage, texture])

  const mineCount = ownership?.divisions.filter(d => d.mine).length ?? 0

  return (
    <div
      className={`${styles.wrap} ${compact ? styles.compact : ''}`}
      data-testid="target-sphere"
      data-life-stage={lifeStage}
      data-life-animated={texture.livingCount > 0 || undefined}
    >
      <div className={styles.head}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <strong className={styles.name}>{target.name}</strong>
        <span className={styles.sub}>
          {HABITABILITY_LABELS[habitability]} · {LIFE_STAGE_LABELS[lifeStage]}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={RENDER_PX}
        height={RENDER_PX}
        style={{ width: size, height: size }}
        aria-label={`${target.name}, ${HABITABILITY_LABELS[habitability].toLowerCase()} body, rotating`}
        role="img"
      />
      {ownership && (
        <div className={styles.owner} data-testid="target-sphere-owner">
          <span className={styles.eyebrow}>OWNER</span>
          <strong>{ownerLabel(ownership.owner)}</strong>
          <span className={styles.sub}>{mineCount > 0 ? `${mineCount} of ${ownership.divisions.length} divisions yours` : `${ownership.divisions.length} divisions`}</span>
        </div>
      )}
      {!compact && biomeIds.length > 0 && (
        <ul className={styles.legend} aria-label="Biomes on this body" data-testid="target-sphere-biomes">
          {biomeIds.map(id => {
            const meta = BIOME_META[id as keyof typeof BIOME_META]
            return (
              <li key={id}>
                <span className={styles.swatch} style={{ background: meta.color }} />
                {meta.label}
              </li>
            )
          })}
        </ul>
      )}
      {!compact && ownership && (
        <ul className={styles.divisions} aria-label="Divisions" data-testid="target-sphere-divisions">
          {ownership.divisions.map(d => (
            <li key={d.division.id} data-mine={d.mine || undefined}>
              <span className={styles.swatch} style={{ background: BIOME_META[d.division.dominantBiome].color }} />
              <span className={styles.divLabel}>{d.division.label}</span>
              <span className={styles.divOwner}>{d.mine ? 'YOURS' : ownerLabel(d.owner)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
