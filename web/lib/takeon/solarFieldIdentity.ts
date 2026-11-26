import { MISSION_ZONES, missionZone, type MissionZone } from '@/lib/data/mission-zone'
import type { SolarLandingPreview } from './solarLandingPreview'

export interface SolarFieldIdentity { kind: 'solar'; version: 1; bodyId: string; zone: MissionZone; seed: number }

export function solarFieldIdentity(landing: SolarLandingPreview, zone?: MissionZone): SolarFieldIdentity {
  if (landing.styleVersion !== 1) throw new Error('Unsupported solar field version')
  return { kind: 'solar', version: 1, bodyId: landing.bodyId, zone: missionZone(zone), seed: landing.seed }
}

/** Legacy snapshots have no marker. Unknown or damaged markers must not silently regenerate a different world. */
export function readSolarFieldIdentity(snapshot?: string): SolarFieldIdentity | undefined {
  if (!snapshot) return undefined
  const doc = JSON.parse(snapshot) as { landnamTerrain?: unknown; config?: { body?: { coreDEM?: { size?: unknown; heights?: unknown; surfaceMaterials?: unknown } } } }
  if (doc.landnamTerrain === undefined) return undefined
  const value = doc.landnamTerrain as Partial<SolarFieldIdentity> | null
  const grid = doc.config?.body?.coreDEM
  if (!value || value.kind !== 'solar' || value.version !== 1 || typeof value.bodyId !== 'string' || !value.bodyId || !MISSION_ZONES.includes(value.zone as MissionZone) || !Number.isSafeInteger(value.seed) || (value.seed as number) < 0 || (value.seed as number) > 0xffffffff || !grid || !Number.isInteger(grid.size) || (grid.size as number) < 2 || !Array.isArray(grid.heights) || !Array.isArray(grid.surfaceMaterials) || grid.heights.length !== (grid.size as number) ** 2 || grid.surfaceMaterials.length !== grid.heights.length || grid.heights.some(n => typeof n !== 'number' || !Number.isFinite(n)) || grid.surfaceMaterials.some(n => !Number.isInteger(n) || n < 1 || n > 255)) throw new Error('Unsupported or incomplete saved solar field')
  return value as SolarFieldIdentity
}

/** Guard against the engine's legacy fallback after a failed snapshot restore. */
export function assertSolarFieldRestored(original: string, restored?: string): void {
  const grid = (snapshot: string) => (JSON.parse(snapshot) as { config?: { body?: { coreDEM?: unknown } } }).config?.body?.coreDEM
  if (!restored || JSON.stringify(grid(original)) !== JSON.stringify(grid(restored))) throw new Error('Saved solar field could not be restored safely')
}

export function writeSolarFieldIdentity(snapshot: string, identity: SolarFieldIdentity): string {
  const doc = JSON.parse(snapshot) as Record<string, unknown>
  doc.landnamTerrain = identity
  const result = JSON.stringify(doc)
  readSolarFieldIdentity(result)
  return result
}
