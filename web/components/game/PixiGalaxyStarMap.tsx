'use client'

/**
 * PixiGalaxyStarMap — pick where the satellite points for the next daily
 * downlink. This is the "zoomed out" sibling of
 * components/TargetPicker/PixiGalaxyMap.tsx: same rendering language (dark
 * bg + starfield + grid, native canvas hit-testing instead of per-frame
 * PixiJS interactive objects, glow rings for selectable/selected markers,
 * labelled bodies) but one level up in abstraction — plotting whole star
 * systems (TESS candidates) instead of planets within one system.
 *
 * Positions are synthetic (candidateSkyPosition) since the shared backend
 * has no real RA/Dec yet — see lib/data/tess-candidates.ts.
 */

import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'
import { candidateSkyPosition, type TessCandidate } from '@/lib/data'

const SKY_BG     = 0x03060a
const GRID_COLOR = 0x87cffa
const STAR_OPEN  = 0x3fa9ff
const STAR_VISITED = 0x39d36a
const STAR_SELECTED = 0xf5a623
const TICK_COLOR = 0x6b7fa3
const SOL_ID = '__sol__'
// Fixed normalized position (not hash-derived like TESS candidates) — our
// own solar system is always in the same place on the map.
const SOL_POS = { x: -0.7, y: -0.62 }

interface HitRegion { id: string; x: number; y: number; r: number }

export interface PixiGalaxyStarMapProps {
  candidates: TessCandidate[]
  visitedIds: Set<string>
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenSol: () => void
  height?: number
}

export default function PixiGalaxyStarMap({ candidates, visitedIds, selectedId, onSelect, onOpenSol, height }: PixiGalaxyStarMapProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const candidatesRef = useRef(candidates); candidatesRef.current = candidates
  const visitedRef = useRef(visitedIds); visitedRef.current = visitedIds
  const selectedRef = useRef(selectedId); selectedRef.current = selectedId
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect
  const onOpenSolRef = useRef(onOpenSol); onOpenSolRef.current = onOpenSol

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;position:absolute;inset:0;touch-action:none;'
    canvas.dataset.testid = 'galaxy-star-map-canvas'
    host.appendChild(canvas)

    const app = new Application()
    let destroyed = false
    let rafId = 0
    let W = 0, H = 0
    const hits: HitRegion[] = []

    const bgLayer = new Container()
    const starLayer = new Container()

    function drawBackground(w: number, h: number) {
      bgLayer.removeChildren().forEach(c => c.destroy({ children: true }))
      const bg = new Graphics()
      bg.rect(0, 0, w, h).fill(SKY_BG)
      bg.circle(w * 0.5, h * 0.5, Math.max(w, h) * 0.48).fill({ color: 0x0a1422, alpha: 0.88 })
      bgLayer.addChild(bg)
      const grid = new Graphics()
      for (let x = 0; x <= w; x += 36) grid.moveTo(x, 0).lineTo(x, h).stroke({ width: 1, color: GRID_COLOR, alpha: 0.06 })
      for (let y = 0; y <= h; y += 36) grid.moveTo(0, y).lineTo(w, y).stroke({ width: 1, color: GRID_COLOR, alpha: 0.06 })
      bgLayer.addChild(grid)
      const speckle = new Graphics()
      const rng = mulberry32(11)
      for (let i = 0; i < 60; i++) {
        speckle.circle(rng() * w, rng() * h, rng() * 1 + 0.3).fill({ color: 0xffffff, alpha: 0.1 + rng() * 0.3 })
      }
      bgLayer.addChild(speckle)
    }

    function drawSol(cx: number, cy: number, scale: number) {
      const sx = cx + SOL_POS.x * scale
      const sy = cy + SOL_POS.y * scale
      const radius = 7

      const marker = new Container()
      marker.x = sx; marker.y = sy

      // Small orbit-ring hint, distinguishing Sol from a plain star marker
      // (this is a system, not just a point of light).
      const orbit = new Graphics()
      orbit.circle(0, 0, radius + 10).stroke({ width: 1, color: 0xf5a623, alpha: 0.35 })
      orbit.circle(0, 0, radius + 16).stroke({ width: 1, color: 0xf5a623, alpha: 0.18 })
      marker.addChild(orbit)

      const sun = new Graphics()
      sun.circle(0, 0, radius).fill({ color: 0xffe1a8, alpha: 1 })
      sun.circle(0, 0, radius + 3).stroke({ width: 1.5, color: 0xf5a623, alpha: 0.7 })
      marker.addChild(sun)

      const label = new Text({ text: 'SOL', style: new TextStyle({ fontFamily: 'Oxanium, monospace', fontSize: 9, fontWeight: '700', fill: 0xf5a623 }) })
      label.anchor.set(0.5, 0)
      label.y = radius + 20
      const labelBg = new Graphics()
      labelBg.roundRect(-(label.width + 8) / 2, radius + 18, label.width + 8, 13, 3).fill({ color: 0x080c16, alpha: 0.74 })
      marker.addChild(labelBg, label)

      starLayer.addChild(marker)
      hits.push({ id: SOL_ID, x: sx, y: sy, r: radius + 16 })
    }

    function drawStars(w: number, h: number, phase: number) {
      starLayer.removeChildren().forEach(c => c.destroy({ children: true }))
      hits.length = 0
      const cx = w / 2, cy = h / 2
      const scale = Math.min(w, h) * 0.44

      drawSol(cx, cy, scale)

      for (const candidate of candidatesRef.current) {
        const pos = candidateSkyPosition(candidate)
        const sx = cx + pos.x * scale
        const sy = cy + pos.y * scale
        const visited = visitedRef.current.has(candidate.id)
        const selected = selectedRef.current === candidate.id
        const color = selected ? STAR_SELECTED : visited ? STAR_VISITED : STAR_OPEN
        const radius = 5

        const marker = new Container()
        marker.x = sx; marker.y = sy

        if (selected) {
          const glow = new Graphics()
          glow.circle(0, 0, radius + 9).fill({ color, alpha: 0.16 })
          glow.circle(0, 0, radius + 5).stroke({ width: 2, color, alpha: 0.95 })
          marker.addChild(glow)
        } else if (!visited) {
          const twinkle = 0.5 + 0.5 * Math.sin(phase * 2 + candidateSkyPosition(candidate).x * 10)
          const ring = new Graphics()
          ring.circle(0, 0, radius + 5).stroke({ width: 1.3, color, alpha: 0.4 + twinkle * 0.3 })
          marker.addChild(ring)
        }

        const g = new Graphics()
        g.circle(0, 0, radius).fill({ color, alpha: visited ? 0.6 : 1 })
        if (visited) {
          g.moveTo(-2.2, 0).lineTo(-0.6, 1.8).lineTo(2.4, -1.8).stroke({ width: 1.3, color: 0x03150a, alpha: 0.9 })
        }
        marker.addChild(g)

        const label = new Text({ text: candidate.toi, style: new TextStyle({ fontFamily: 'Oxanium, monospace', fontSize: 9, fill: selected ? STAR_SELECTED : 0xcde4ff }) })
        label.anchor.set(0.5, 0)
        label.y = radius + 5
        const labelBg = new Graphics()
        labelBg.roundRect(-(label.width + 8) / 2, radius + 3, label.width + 8, 13, 3).fill({ color: 0x080c16, alpha: 0.74 })
        marker.addChild(labelBg, label)

        starLayer.addChild(marker)
        hits.push({ id: candidate.id, x: sx, y: sy, r: radius + 10 })
      }
    }

    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)
      const hit = hits.find(b => Math.hypot(mx - b.x, my - b.y) <= b.r)
      if (!hit) return
      if (hit.id === SOL_ID) onOpenSolRef.current()
      else onSelectRef.current(hit.id)
    })

    const doInit = async () => {
      try {
        const rect = host.getBoundingClientRect()
        W = Math.round(Math.max(200, rect.width))
        H = Math.round(height ?? Math.max(100, rect.height))
        const dpr = window.devicePixelRatio || 1
        await app.init({ canvas, width: W, height: H, background: SKY_BG, antialias: true, autoDensity: true, resolution: dpr })
        if (destroyed) return
        app.stage.addChild(bgLayer, starLayer)
        drawBackground(W, H)
        drawStars(W, H, 0)
        app.ticker.add(ticker => {
          if (destroyed) return
          drawStars(W, H, (ticker.lastTime ?? 0) / 1000)
        })
      } catch (err) {
        console.error('[PixiGalaxyStarMap] init failed:', err)
      }
    }
    rafId = requestAnimationFrame(() => doInit())

    return () => {
      cancelAnimationFrame(rafId)
      destroyed = true
      if (app.renderer) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
        canvas.remove()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

  return (
    <div
      ref={hostRef}
      data-testid="galaxy-star-map"
      style={{ position: 'relative', width: '100%', height: height ? `${height}px` : '100%', cursor: 'pointer' }}
    />
  )
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
