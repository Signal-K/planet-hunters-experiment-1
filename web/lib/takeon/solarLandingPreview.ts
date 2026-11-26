import { stableSeed } from '@/lib/data/biomes'
import { missionZone, zoneLongitude, type MissionZone } from '@/lib/data/mission-zone'

export interface SolarLandingPreview {
  bodyId: string
  seed: number
  styleVersion: number
  latitude: number
  longitude: number
  stepDegrees: number
  width: number
  height: number
  center: { radius: number; biome: string }
  patch: { radius: number; biome: string }[]
}

type SolarTransport = (request: string) => string

/** Preview-only identity. It does not change or identify an existing rover save. */
export function previewLandingRequest(targetId: string, zone?: MissionZone) {
  return { id: targetId, seed: stableSeed(targetId), styleVersion: 1, latitude: 0, longitude: zoneLongitude(zone), step: 0.08, width: 81, height: 81 }
}

export function requestLandingPreview(transport: SolarTransport, targetId: string, zone?: MissionZone): SolarLandingPreview {
  const solar = previewLandingRequest(targetId, zone)
  const response = JSON.parse(transport(JSON.stringify({ op: 'solarLanding', solar }))) as { ok: boolean; error?: string; value?: SolarLandingPreview }
  const value = response.value
  if (!response.ok || !value || value.bodyId !== solar.id || value.seed !== solar.seed || value.styleVersion !== solar.styleVersion || value.width !== solar.width || value.height !== solar.height || value.latitude !== solar.latitude || value.longitude !== solar.longitude || value.stepDegrees !== solar.step || !Array.isArray(value.patch) || value.patch.length !== solar.width * solar.height || !Number.isFinite(value.center?.radius) || typeof value.center.biome !== 'string' || value.patch.some(sample => !sample || !Number.isFinite(sample.radius) || typeof sample.biome !== 'string')) {
    throw new Error(response.error ?? 'Invalid Takeon landing preview')
  }
  // Never hand a rover a patch whose centre differs from its orbital sample.
  const center = value.patch[Math.floor(value.height / 2) * value.width + Math.floor(value.width / 2)]
  if (center.radius !== value.center.radius || center.biome !== value.center.biome) {
    throw new Error('Takeon landing center does not match its surface patch')
  }
  return value
}

/** Convert the same spherical samples into the normalized DEM the rover engine accepts. */
export function landingDem(landing: SolarLandingPreview) {
  const radii = landing.patch.map(sample => sample.radius)
  const min = Math.min(...radii)
  const range = Math.max(...radii) - min
  return {
    source: `Takeon solar ${landing.bodyId}, style ${landing.styleVersion}, seed ${landing.seed}`,
    size: landing.width,
    heights: radii.map(radius => range > 0 ? (radius - min) / range : 0.5),
  }
}

/** Build matching elevation and categorical surface grids for a new field. */
export function landingTerrain(landing: SolarLandingPreview, materials: Readonly<Record<string, number>>) {
  const dem = landingDem(landing)
  const surfaceMaterials = landing.patch.map(sample => {
    const material = materials[sample.biome]
    if (!Number.isInteger(material) || material < 1 || material > 255) {
      throw new Error(`No surface material for solar biome ${sample.biome}`)
    }
    return material
  })
  return { ...dem, surfaceMaterials }
}

let solarTransport: Promise<SolarTransport> | undefined
const landingCache = new Map<string, Promise<SolarLandingPreview>>()

export async function loadSolarTransport(): Promise<SolarTransport> {
  // The public assets are generated together by sync-takeon-go-wasm.sh.
  solarTransport ??= (async () => {
    // Next.js cannot bundle a runtime-computed import of the public Go shim.
    // Load the matching shim as a script, then retain this VM's transport even
    // if another Takeon runtime later installs its own global bridge.
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = '/takeon-go/wasm_exec.js'
      script.onload = () => resolve()
      script.onerror = () => { script.remove(); reject(new Error('Takeon Go shim failed to load')) }
      document.head.appendChild(script)
    })
    const globals = globalThis as typeof globalThis & { Go?: new () => { importObject: WebAssembly.Imports; run(instance: WebAssembly.Instance): Promise<void> }; takeonCore?: SolarTransport }
    if (!globals.Go) throw new Error('Takeon Go shim unavailable')
    const go = new globals.Go()
    const response = await fetch('/takeon-go/takeon.wasm')
    if (!response.ok) throw new Error(`Takeon Go WASM failed to load (${response.status})`)
    const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), go.importObject)
    const previous = globals.takeonCore
    const running = go.run(instance)
    const transport = globals.takeonCore
    if (!transport || transport === previous) throw new Error('Takeon Go bridge unavailable')
    void running.catch(error => console.error('Takeon Go runtime stopped', error))
    return transport
  })().catch(error => { solarTransport = undefined; throw error })
  return solarTransport
}

export function loadLandingPreview(targetId: string, zone?: MissionZone): Promise<SolarLandingPreview> {
  const key = `${targetId}:${missionZone(zone)}`
  let landing = landingCache.get(key)
  if (!landing) {
    landing = loadSolarTransport().then(transport => requestLandingPreview(transport, targetId, zone)).catch(error => { landingCache.delete(key); throw error })
    landingCache.set(key, landing)
  }
  return landing
}
