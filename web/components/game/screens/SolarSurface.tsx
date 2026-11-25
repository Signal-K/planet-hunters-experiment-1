'use client'

import { useEffect, useRef, useState } from 'react'
import { loadLandingPreview } from '@/lib/takeon/solarLandingPreview'
import { loadObservedPatch, observedCoverage, observedHex } from '@/lib/takeon/solarObserved'
import { solarBiomeColour } from '@/lib/takeon/solarBiomeColour'
import { mixHex, type Ramp } from '@/lib/takeon/terrainColour'
import type { MissionZone } from '@/lib/data/mission-zone'

interface Props { targetId: string; zone?: MissionZone; ground: Ramp; realism?: number; onReady: (ready: boolean) => void }

/** An angled relief view of the actual landing patch, using the orbital biome palette. */
export default function SolarSurface({ targetId, zone, ground, realism = 0, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const palette = ground.join(',')
  useEffect(() => {
    let cancelled = false
    onReady(false)
    setReady(false)
    async function draw() {
      const landing = await loadLandingPreview(targetId, zone)
      const observed = realism > 0 && observedCoverage(targetId) !== 'none' ? await loadObservedPatch(targetId, landing.stepDegrees, landing.width, landing.height, zone) : null
      if (cancelled) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) throw new Error('Surface canvas unavailable')
      const colours = palette.split(',') as unknown as Ramp
      const samples = landing.patch
      const min = Math.min(...samples.map(s => s.radius))
      const max = Math.max(...samples.map(s => s.radius))
      const range = Math.max(0.00001, max - min)
      const w = landing.width, h = landing.height
      const point = (x: number, y: number) => {
        const sample = samples[y * w + x]
        return { x: 600 + (x - y) * 21, y: 400 + (x + y - w + 1) * 10 - (sample.radius - min) / range * 220 }
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = colours[1]
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
        const i = y * w + x
        const points = [point(x, y), point(x + 1, y), point(x, y + 1), point(x + 1, y + 1)]
        const base = observed ? mixHex(solarBiomeColour(samples[i].biome, colours), observedHex(observed[i]), realism) : solarBiomeColour(samples[i].biome, colours)
        const slope = (samples[i + 1].radius + samples[i + w].radius - 2 * samples[i].radius) / range
        const shade = Math.min(0.14, Math.abs(slope) * 2)
        const fill = mixHex(base, slope > 0 ? '#f4d7a2' : '#3c2823', shade + 0.035)
        for (const [a,b,c] of [[0,1,2],[1,3,2]]) {
          ctx.beginPath(); ctx.moveTo(points[a].x, points[a].y); ctx.lineTo(points[b].x, points[b].y); ctx.lineTo(points[c].x, points[c].y); ctx.closePath()
          ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = 0.8; ctx.fill(); ctx.stroke()
        }
      }
      // Soften the mesh facets before adding crisp surface detail.
      const softened = document.createElement('canvas')
      softened.width = canvas.width; softened.height = canvas.height
      softened.getContext('2d')?.drawImage(canvas, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.filter = 'blur(2px)'; ctx.drawImage(softened, 0, 0); ctx.filter = 'none'
      // Small deterministic surface stones, not a square gameplay grid.
      for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
        const hash = Math.imul(x + landing.seed, 73856093) ^ Math.imul(y + landing.seed, 19349663)
        if ((hash >>> 0) % 61 !== 0) continue
        const p = point(x, y), base = observed ? mixHex(solarBiomeColour(samples[y * w + x].biome, colours), observedHex(observed[y * w + x]), realism) : solarBiomeColour(samples[y * w + x].biome, colours)
        const size = 2.5 + ((hash >>> 8) & 3)
        ctx.fillStyle = mixHex(base, '#2d2521', 0.55)
        ctx.beginPath(); ctx.ellipse(p.x + 1, p.y + 2, size * 1.35, size * 0.5, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = mixHex(base, '#362d28', 0.35)
        ctx.beginPath(); ctx.moveTo(p.x - size, p.y); ctx.lineTo(p.x - size * 0.35, p.y - size * 0.9); ctx.lineTo(p.x + size * 0.55, p.y - size * 0.75); ctx.lineTo(p.x + size, p.y); ctx.closePath(); ctx.fill()
      }
      setReady(true)
      onReady(true)
    }
    draw().catch(error => { if (!cancelled) console.warn('Takeon solar surface unavailable; using the existing field', error) })
    return () => { cancelled = true; onReady(false) }
  }, [targetId, zone, palette, realism, onReady])
  return <canvas ref={canvasRef} width={1200} height={800} aria-hidden="true" data-testid="solar-surface" style={{ position: 'absolute', width: '100%', height: '100%', inset: 0, objectFit: 'cover', opacity: ready ? 1 : 0, pointerEvents: 'none' }} />
}
