'use client'

import { useEffect, useRef, useState } from 'react'
import { loadLandingPreview } from '@/lib/takeon/solarLandingPreview'
import { loadOrbitPreview } from '@/lib/takeon/solarOrbit'
import { loadObservedPatch, observedCoverage, observedHex } from '@/lib/takeon/solarObserved'
import { solarBiomeColour } from '@/lib/takeon/solarBiomeColour'
import { mixHex, type Ramp } from '@/lib/takeon/terrainColour'
import type { MissionZone } from '@/lib/data/mission-zone'

interface Props {
  targetId: string
  zone?: MissionZone
  colours: readonly string[]
  scale: number
  opacity: number
  realism?: number
  landable?: boolean
  onReady: (ready: boolean) => void
  mapIcon?: boolean
}

/** Renders the same versioned terrain field used for the surface DEM. */
export default function SolarOrbitGlobe({ targetId, zone, colours, scale, opacity, realism = 0, landable = true, onReady, mapIcon = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const palette = colours.join(',')

  useEffect(() => {
    let cancelled = false
    onReady(false)
    setFailed(false)
    async function draw() {
      const [landing, orbit] = await Promise.all([landable && !mapIcon ? loadLandingPreview(targetId, zone) : Promise.resolve(null), loadOrbitPreview(targetId, zone)])
      const observed = realism > 0 && observedCoverage(targetId) !== 'none' ? await loadObservedPatch(targetId, orbit.stepDegrees, orbit.width, orbit.height, zone) : null
      const middle = (orbit.height >> 1) * orbit.width + (orbit.width >> 1)
      if (landing && (orbit.patch[middle].radius !== landing.center.radius || orbit.patch[middle].biome !== landing.center.biome)) throw new Error('Orbit and landing do not share a terrain sample')
      if (cancelled) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) throw new Error('Canvas unavailable')
      // Smooth between sampled biomes instead of painting flat triangles.
      // Interpolation improves presentation; it does not add measured detail.
      const radius = canvas.width * 180 / 512
      const center = canvas.width / 2
      const colours = palette.split(',') as unknown as Ramp
      const rgb = orbit.patch.map((sample, index) => {
        const base = solarBiomeColour(sample.biome, colours)
        const hex = (observed ? mixHex(base, observedHex(observed[index]), realism) : base).slice(1)
        return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
      })
      const image = ctx.createImageData(canvas.width, canvas.height)
      const halfX = (orbit.width - 1) / 2, halfY = (orbit.height - 1) / 2
      for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
        const x = (px + 0.5 - center) / radius, y = (py + 0.5 - center) / radius
        const r2 = x * x + y * y
        if (r2 >= 1) continue
        const depth = Math.sqrt(1 - r2)
        const latitude = Math.asin(-y) * 180 / Math.PI
        const longitude = Math.atan2(x, depth) * 180 / Math.PI
        const gx = Math.max(0, Math.min(orbit.width - 1.001, halfX + longitude / orbit.stepDegrees))
        // Wavy, seeded-looking cloud bands for gas bodies; fade the invented
        // distortion out when showing registered observed imagery.
        const cloudWarp = landable ? 0 : (1 - realism) * (1.5 * Math.sin(longitude * 0.11 + Math.sin(latitude * 0.18)) + 0.5 * Math.sin(longitude * 0.27 + latitude * 0.12))
        const gy = Math.max(0, Math.min(orbit.height - 1.001, halfY + (latitude + cloudWarp) / orbit.stepDegrees))
        const ix = Math.floor(gx), iy = Math.floor(gy), tx = gx - ix, ty = gy - iy
        const ids = [iy * orbit.width + ix, iy * orbit.width + ix + 1, (iy + 1) * orbit.width + ix, (iy + 1) * orbit.width + ix + 1]
        const weights = [(1-tx)*(1-ty), tx*(1-ty), (1-tx)*ty, tx*ty]
        const relief = ids.reduce((sum, id, i) => sum + orbit.patch[id].radius * weights[i], 0)
        // The system map uses a consistent upper-left light, giving each tiny
        // world a readable day/night terminator while retaining Takeon's terrain.
        const diffuse = Math.max(0, -x * 0.48 - y * 0.42 + depth * 0.77)
        const light = mapIcon ? 0.30 + diffuse * 0.78 + (relief - 1) * 1.5 : Math.max(0.42, 0.64 + depth * 0.3 + (relief - 1) * 1.5)
        const highlight = mapIcon ? Math.pow(Math.max(0, -x * 0.32 - y * 0.34 + depth * 0.88), 24) * 32 : 0
        const rim = mapIcon ? Math.pow(1 - depth, 3) * diffuse * 24 : 0
        const offset = (py * canvas.width + px) * 4
        for (let c = 0; c < 3; c++) {
          const colour = ids.reduce((sum, id, i) => sum + rgb[id][c] * weights[i], 0)
          image.data[offset + c] = colour * light + highlight + rim * (c === 2 ? 1 : 0.65)
        }
        image.data[offset + 3] = Math.min(255, (1 - Math.sqrt(r2)) * radius * 255)
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.putImageData(image, 0, 0)
      onReady(true)
    }
    draw().catch(error => {
      if (!cancelled) {
        console.warn('Takeon orbital terrain unavailable; using the existing view', error)
        setFailed(true)
      }
    })
    return () => { cancelled = true; onReady(false) }
  }, [targetId, zone, palette, realism, landable, onReady, mapIcon])

  return <canvas ref={canvasRef} width={mapIcon ? 256 : 512} height={mapIcon ? 256 : 512} aria-hidden="true" data-testid="solar-orbit-globe" style={mapIcon ? { position: 'absolute', inset: '-21%', width: '142%', height: '142%', opacity: failed ? 0 : opacity, pointerEvents: 'none' } : { position: 'absolute', width: '70%', height: 'auto', left: '15%', top: '64%', transform: `translateY(-50%) scale(${scale})`, opacity: failed ? 0 : opacity, pointerEvents: 'none' }} />
}
