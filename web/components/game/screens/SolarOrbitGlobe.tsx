'use client'

import { useEffect, useRef, useState } from 'react'
import { loadLandingPreview } from '@/lib/takeon/solarLandingPreview'
import { loadOrbitPreview, orbitMesh } from '@/lib/takeon/solarOrbit'
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
      // Rasterise Takeon's actual hemisphere, retaining irregular silhouettes
      // as well as the same radius/biome samples used at the landing site.
      const mesh = orbitMesh(orbit)
      const extent = Math.max(1, ...orbit.patch.map(sample => sample.radius))
      const vertices = mesh.map((point, index) => {
        const sample = orbit.patch[index]
        const nx = point.x / sample.radius, ny = point.y / sample.radius
        const diffuse = Math.max(0, -nx * .48 - ny * .42 + point.depth * .77)
        const light = mapIcon ? .30 + diffuse * .78 : Math.max(.42, .64 + point.depth * .3 + (sample.radius - 1) * 1.5)
        return { x: center + point.x * radius / extent, y: center + point.y * radius / extent,
          z: point.depth * sample.radius, colour: rgb[index].map(value => value * light) }
      })
      const depth = new Float32Array(canvas.width * canvas.height).fill(-Infinity)
      const triangle = (ia: number, ib: number, ic: number) => {
        const a = vertices[ia], b = vertices[ib], c = vertices[ic]
        const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
        if (Math.abs(denominator) < .00001) return
        const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)))
        const x1 = Math.min(canvas.width - 1, Math.ceil(Math.max(a.x, b.x, c.x)))
        const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)))
        const y1 = Math.min(canvas.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)))
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const wa = ((b.y - c.y) * (x + .5 - c.x) + (c.x - b.x) * (y + .5 - c.y)) / denominator
          const wb = ((c.y - a.y) * (x + .5 - c.x) + (a.x - c.x) * (y + .5 - c.y)) / denominator
          const wc = 1 - wa - wb
          if (wa < 0 || wb < 0 || wc < 0) continue
          const pixel = y * canvas.width + x, z = wa * a.z + wb * b.z + wc * c.z
          if (z < depth[pixel]) continue
          depth[pixel] = z
          for (let channel = 0; channel < 3; channel++) image.data[pixel * 4 + channel] = wa * a.colour[channel] + wb * b.colour[channel] + wc * c.colour[channel]
          image.data[pixel * 4 + 3] = 255
        }
      }
      for (let y = 0; y < orbit.height - 1; y++) for (let x = 0; x < orbit.width - 1; x++) {
        const i = y * orbit.width + x
        triangle(i, i + 1, i + orbit.width)
        triangle(i + 1, i + orbit.width + 1, i + orbit.width)
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

  return <canvas ref={canvasRef} width={mapIcon ? 256 : 512} height={mapIcon ? 256 : 512} aria-hidden="true" data-testid="solar-orbit-globe" style={mapIcon ? { position: 'absolute', inset: '-21%', width: '142%', height: '142%', opacity: failed ? 0 : opacity, pointerEvents: 'none' } : { position: 'absolute', width: '60%', height: 'auto', left: '20%', top: '58%', transform: `translateY(-50%) scale(${scale})`, opacity: failed ? 0 : opacity, pointerEvents: 'none' }} />
}
