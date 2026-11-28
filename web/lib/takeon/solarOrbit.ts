import { hasMatchingSolarCenter, loadSolarTransport, previewLandingRequest, type SolarLandingPreview } from './solarLandingPreview'
import { missionZone, type MissionZone } from '@/lib/data/mission-zone'

type Transport = (request: string) => string

/** A hemisphere centred on the landing coordinates, sampled by the versioned orbital API. */
export function requestOrbitPreview(transport: Transport, targetId: string, zone?: MissionZone): SolarLandingPreview {
  const identity = previewLandingRequest(targetId, zone)
  const solar = { ...identity, step: 1.5, width: 119, height: 119 }
  const response = JSON.parse(transport(JSON.stringify({ op: 'solarOrbit', solar }))) as { ok: boolean; error?: string; value?: SolarLandingPreview }
  const value = response.value
  if (!response.ok || !value || value.bodyId !== solar.id || value.seed !== solar.seed || value.styleVersion !== solar.styleVersion || value.width !== solar.width || value.height !== solar.height || value.latitude !== solar.latitude || value.longitude !== solar.longitude || value.stepDegrees !== solar.step || !Array.isArray(value.patch) || value.patch.length !== solar.width * solar.height || value.patch.some(point => !point || !Number.isFinite(point.radius) || typeof point.biome !== 'string') || !hasMatchingSolarCenter(value)) {
    throw new Error(response.error ?? 'Invalid Takeon orbital preview')
  }
  return value
}

/** Orthographic mesh: the centre vertex is precisely the landing sample. */
export function orbitMesh(orbit: SolarLandingPreview) {
  const halfX = (orbit.width - 1) / 2
  const halfY = (orbit.height - 1) / 2
  return orbit.patch.map((sample, index) => {
    const lat = ((index / orbit.width | 0) - halfY) * orbit.stepDegrees * Math.PI / 180
    const lon = ((index % orbit.width) - halfX) * orbit.stepDegrees * Math.PI / 180
    const cosLat = Math.cos(lat)
    return { x: cosLat * Math.sin(lon) * sample.radius, y: -Math.sin(lat) * sample.radius, depth: cosLat * Math.cos(lon), radius: sample.radius, biome: sample.biome }
  })
}

const orbitCache = new Map<string, Promise<SolarLandingPreview>>()
/** Reuse the expensive generated hemisphere when the visual slider changes. */
export function loadOrbitPreview(targetId: string, zone?: MissionZone): Promise<SolarLandingPreview> {
  const key = `${targetId}:${missionZone(zone)}`
  let orbit = orbitCache.get(key)
  if (!orbit) {
    orbit = loadSolarTransport().then(transport => requestOrbitPreview(transport, targetId, zone)).catch(error => { orbitCache.delete(key); throw error })
    orbitCache.set(key, orbit)
  }
  return orbit
}

/** Illustrative axial orientation and measured approximate polar/equatorial ratio. */
export function gasGiantPoint(id: string, x: number, y: number, z: number) {
  const shape: Record<string, readonly [number, number]> = {
    jupiter: [3, .935], saturn: [27, .902], uranus: [82, .977], neptune: [28, .983],
  }
  const [degrees, flattening] = shape[id] ?? [0, 1]
  const angle = degrees * Math.PI / 180
  // Tip the pole slightly toward the viewer, exposing Saturn's ring plane.
  const pole = id === 'saturn' ? .35 : id === 'uranus' ? .2 : 0
  const py = y * flattening * Math.cos(pole) - z * Math.sin(pole)
  const pz = y * flattening * Math.sin(pole) + z * Math.cos(pole)
  return { x: x * Math.cos(angle) - py * Math.sin(angle), y: x * Math.sin(angle) + py * Math.cos(angle), z: pz }
}

/** Saturn's main rings, including the Cassini gap, in equatorial-radius units. */
export function gasGiantRings(id: string) {
  if (id !== 'saturn') return []
  return [
    { inner: 1.24, outer: 1.52, colour: '#8d8576' },
    { inner: 1.52, outer: 1.95, colour: '#d4c6a4' },
    { inner: 2.03, outer: 2.27, colour: '#b9ad90' },
  ]
}
