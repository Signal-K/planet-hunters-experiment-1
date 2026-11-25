import { loadSolarTransport, previewLandingRequest, type SolarLandingPreview } from './solarLandingPreview'
import { missionZone, type MissionZone } from '@/lib/data/mission-zone'

type Transport = (request: string) => string

/** A hemisphere centred on the landing coordinates, sampled by the versioned orbital API. */
export function requestOrbitPreview(transport: Transport, targetId: string, zone?: MissionZone): SolarLandingPreview {
  const identity = previewLandingRequest(targetId, zone)
  const solar = { ...identity, step: 1.5, width: 119, height: 119 }
  const response = JSON.parse(transport(JSON.stringify({ op: 'solarOrbit', solar }))) as { ok: boolean; error?: string; value?: SolarLandingPreview }
  const value = response.value
  if (!response.ok || !value || value.bodyId !== solar.id || value.seed !== solar.seed || value.styleVersion !== solar.styleVersion || value.width !== solar.width || value.height !== solar.height || value.latitude !== solar.latitude || value.longitude !== solar.longitude || value.stepDegrees !== solar.step || !Array.isArray(value.patch) || value.patch.length !== solar.width * solar.height || value.patch.some(point => !point || !Number.isFinite(point.radius) || typeof point.biome !== 'string')) {
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
