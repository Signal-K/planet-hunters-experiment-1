'use client'

import { useEffect, useRef } from 'react'
import { paletteForTarget } from '@/lib/mining/laserPalette'
import { layoutForPalette, PIECE_SIZE, type TerrainPiece } from '@/lib/mining/landscape'
import { cratePlan, groundColor, hex, skyColor, surfaceRatio } from '@/lib/mining/destinationVista'

const TERRAIN: Record<TerrainPiece, string> = {
  mountain: '/game/assets/mining/terrain_mountain.png',
  ridge: '/game/assets/mining/terrain_ridge.png',
  strata: '/game/assets/mining/terrain_strata.png',
}

export interface VistaTarget {
  id: string
  type: string
  archetype?: string | null
}

interface DestinationLandscapeProps {
  target: VistaTarget
  cargo?: { id: string; units: number }[]
  variant?: 'scene' | 'card'
  className?: string
}

const images = new Map<string, Promise<HTMLImageElement | null>>()

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = images.get(src)
  if (cached) return cached
  const pending = new Promise<HTMLImageElement | null>(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
  images.set(src, pending)
  return pending
}

/** Shift yellow, orange and green crate pixels to blueprint blue or cool grey. */
function recolorCrate(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const g = canvas.getContext('2d')
  if (!g) return canvas
  g.drawImage(img, 0, 0)
  const frame = g.getImageData(0, 0, canvas.width, canvas.height)
  const px = frame.data
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 16) continue
    const r = px[i]
    const gch = px[i + 1]
    const b = px[i + 2]
    const yellow = r > 180 && gch > 150 && b < 130
    const orange = r - b > 60 && gch > b + 20 && r > 140
    const green = gch > r + 15 && gch > b + 15 && gch > 80
    const purple = b > r * 0.85 && b > gch + 18 && r > gch - 5 && b > 70 && gch < 180
    if (yellow || orange || purple) {
      px[i] = 0x1f
      px[i + 1] = 0x78
      px[i + 2] = 0xc1
    } else if (green) {
      px[i] = 0x8a
      px[i + 1] = 0x9a
      px[i + 2] = 0xaa
    }
  }
  g.putImageData(frame, 0, 0)
  return canvas
}

function tintSprite(img: HTMLImageElement, tint: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const g = canvas.getContext('2d')
  if (!g) return canvas
  g.drawImage(img, 0, 0)
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = 0.78
  g.fillStyle = tint
  g.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}

export default function DestinationLandscape({ target, cargo = [], variant = 'scene', className }: DestinationLandscapeProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cargoRef = useRef(cargo)
  cargoRef.current = cargo
  const cargoKey = cargo.map(entry => `${entry.id}:${entry.units}`).join('|')

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const haul = cargoRef.current
    let cancelled = false

    const paint = async () => {
      const ctx = canvas.getContext('2d')
      if (!ctx || cancelled) return
      const palette = paletteForTarget({ id: target.id, type: target.type, archetype: target.archetype })
      const layout = layoutForPalette(palette, target.id || palette.id)
      const pieces = await Promise.all((['mountain', 'ridge', 'strata'] as const).map(async kind => {
        const img = await loadImage(TERRAIN[kind])
        return [kind, img ? tintSprite(img, `#${layout.tint.toString(16).padStart(6, '0')}`) : null] as const
      }))
      const plan = variant === 'scene' ? cratePlan(haul) : []
      const crates = await Promise.all(plan.map(async stack => {
        const img = await loadImage(`/art/scenes/exchange/${stack.file}`)
        return [stack.file, img ? recolorCrate(img) : null] as const
      }))
      if (cancelled) return
      const width = Math.max(1, canvas.clientWidth)
      const height = Math.max(1, canvas.clientHeight)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false

      const surface = height * surfaceRatio(width, height, variant)
      const sky = ctx.createLinearGradient(0, 0, 0, Math.max(surface, 1))
      sky.addColorStop(0, hex(skyColor(palette.skyTop)))
      sky.addColorStop(1, hex(skyColor(palette.skyHorizon)))
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = hex(groundColor(palette.landscape?.tint))
      ctx.fillRect(0, surface, width, height - surface)
      ctx.fillStyle = hex(skyColor(palette.nearRidge))
      ctx.fillRect(0, surface - 3, width, 4)

      ctx.fillStyle = '#d5e4f2'
      const stars = variant === 'card' ? 10 : 22
      for (let i = 0; i < stars; i++) {
        ctx.globalAlpha = 0.35 + (i % 3) * 0.18
        const sx = ((i * 97) % 1000) / 1000 * width
        const sy = ((i * 53) % 700) / 1000 * surface
        const s = i % 5 === 0 ? 2 : 1
        ctx.fillRect(sx, sy, s, s)
      }
      ctx.globalAlpha = 1

      const sprite = Object.fromEntries(pieces) as Partial<Record<TerrainPiece, HTMLCanvasElement | null>>
      const scale = variant === 'card' ? Math.max(0.34, width / 920) : Math.max(0.55, Math.min(1.15, width / 1100))
      const period = layout.period * scale
      const copies = Math.ceil(width / Math.max(period, 1)) + 1
      for (let copy = 0; copy < copies; copy++) {
        for (const piece of layout.pieces) {
          const image = sprite[piece.kind]
          if (!image) continue
          const [pw, ph] = PIECE_SIZE[piece.kind]
          const dw = pw * scale * piece.scale
          const dh = ph * scale * piece.scale
          const x = copy * period + piece.x * scale
          const y = surface - dh + 4
          ctx.save()
          ctx.translate(x, y + dh)
          ctx.scale(piece.flip ? -1 : 1, 1)
          ctx.drawImage(image, -dw / 2, -dh, dw, dh)
          ctx.restore()
        }
      }

      if (variant === 'scene') {
        const byFile = Object.fromEntries(crates)
        let x = width > height * 1.2 ? width * 0.08 : width * 0.1
        const crateH = Math.min(128, Math.max(84, height * 0.22))
        for (const stack of plan) {
          const image = byFile[stack.file]
          if (!image) continue
          const aspect = image.width / Math.max(image.height, 1)
          const cw = crateH * aspect
          for (let i = 0; i < stack.count; i++) {
            ctx.drawImage(image, x + i * cw * 0.34, surface - crateH + 8 - i * 3, cw, crateH)
          }
          x += cw + Math.max(cw * 0.35, 18) + stack.count * cw * 0.18
        }
      }
    }

    void paint()
    if (typeof ResizeObserver === 'undefined') {
      return () => { cancelled = true }
    }
    const observer = new ResizeObserver(() => { void paint() })
    observer.observe(canvas)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [target.id, target.type, target.archetype, cargoKey, variant])

  const summary = cargo.filter(entry => entry.units > 0).map(entry => `${entry.units} ${entry.id}`).join(', ')
  return (
    <canvas
      ref={ref}
      className={className}
      aria-label={summary ? `Destination landscape. Cargo ${summary}` : 'Destination landscape'}
    />
  )
}
