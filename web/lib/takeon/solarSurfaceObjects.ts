import type { SolarLandingPreview } from './solarLandingPreview'

export type SurfaceObjectKind = 'rock' | 'ice'
export interface SurfaceObject { x: number; y: number; size: number; kind: SurfaceObjectKind }

/** Stable visual detail tied to a sampled landing site and its actual biome. */
export function solarSurfaceObjects(landing: SolarLandingPreview): SurfaceObject[] {
  const objects: SurfaceObject[] = []
  for (let y = 3; y < landing.height - 3; y++) for (let x = 3; x < landing.width - 3; x++) {
    const biome = landing.patch[y * landing.width + x].biome
    if (biome === 'ocean' || biome === 'methane-lakes') continue
    const site = Math.round((landing.longitude + 180) * 100) ^ Math.round((landing.latitude + 90) * 100)
    const hash = (Math.imul(x + landing.seed, 73856093) ^ Math.imul(y + landing.seed, 19349663) ^ Math.imul(site, 83492791)) >>> 0
    if (hash % 61 !== 0) continue
    objects.push({ x, y, size: 2.5 + ((hash >>> 8) & 3), kind: biome === 'ice' || biome === 'icefield' || biome === 'ice-ridges' ? 'ice' : 'rock' })
  }
  return objects
}
