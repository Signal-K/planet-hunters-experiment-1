'use client'

// SSL-317: lit, slowly rotating pixel sphere of a target body, drawn from the
// same `sampleSurface` biome model takeon uses for the voxel field, so what the
// player sees on approach is the world they land on. Rendering is cel-shaded
// (three light bands, no gradients) to match the chunky faceted art direction.
//
// The biome texture is sampled once per (target, lifeStage) into a small
// equirectangular map; each frame only rotates and lights it, so the sphere
// stays cheap on phones.

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
  /** RGB per texel, row-major from the north pole. */
  rgb: Uint8ClampedArray
  /** Per-texel 0..1 elevation for the shade pass. */
  elevation: Float32Array
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function buildTexture(target: SurfaceTarget, lifeStage: LifeStage): Texture {
  const rgb = new Uint8ClampedArray(TEX_W * TEX_H * 3)
  const elevation = new Float32Array(TEX_W * TEX_H)
  const colorCache = new Map<string, [number, number, number]>()
  for (let y = 0; y < TEX_H; y++) {
    const lat = Math.PI / 2 - ((y + 0.5) / TEX_H) * Math.PI
    for (let x = 0; x < TEX_W; x++) {
      const lon = -Math.PI + ((x + 0.5) / TEX_W) * Math.PI * 2
      const sample = sampleSurface(target, lat, lon, lifeStage)
      const meta = BIOME_META[sample.biome]
      const key = sample.elevation < 0.42 ? meta.shade : meta.color
      let c = colorCache.get(key)
      if (!c) { c = hexToRgb(key); colorCache.set(key, c) }
      const i = y * TEX_W + x
      rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]
      elevation[i] = sample.elevation
    }
  }
  return { rgb, elevation }
}

/** Quantised cel lighting: lit, mid, shadow. */
function celBand(dot: number): number {
  if (dot > 0.55) return 1
  if (dot > 0.15) return 0.78
  return 0.5
}

function paint(ctx: CanvasRenderingContext2D, tex: Texture, rotation: number, showDivisions: boolean) {
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
      const k = boundary ? light * 0.45 : light
      data[o] = tex.rgb[ti * 3] * k
      data[o + 1] = tex.rgb[ti * 3 + 1] * k
      data[o + 2] = tex.rgb[ti * 3 + 2] * k
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
    let frame = 0
    let last = 0
    let rotation = 0
    const tick = (t: number) => {
      if (t - last >= FRAME_MS) {
        rotation = (t * ROTATION_PER_MS) % (Math.PI * 2)
        paint(ctx, texture, rotation, !compact)
        last = t
      }
      frame = window.requestAnimationFrame(tick)
    }
    paint(ctx, texture, 0, !compact)
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [compact, texture])

  const mineCount = ownership?.divisions.filter(d => d.mine).length ?? 0

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`} data-testid="target-sphere" data-life-stage={lifeStage}>
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
