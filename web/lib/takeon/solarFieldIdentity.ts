import { MISSION_ZONES, missionZone, type MissionZone } from '@/lib/data/mission-zone'
import type { SolarLandingPreview } from './solarLandingPreview'

export interface SolarFieldIdentity { kind: 'solar'; version: 1; bodyId: string; zone: MissionZone; seed: number; palette?: Record<string, [string, string, string]> }

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
  if (value.palette !== undefined && (!value.palette || typeof value.palette !== 'object' || Array.isArray(value.palette) || Object.entries(value.palette).some(([id, colors]) => !/^(?:[1-9]\d{0,2})$/.test(id) || Number(id) > 255 || !Array.isArray(colors) || colors.length !== 3 || colors.some(color => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))))) throw new Error('Unsupported saved solar palette')
  return value as SolarFieldIdentity
}

/** Guard against the engine's legacy fallback after a failed snapshot restore. */
export function assertSolarFieldRestored(original: string, restored?: string): void {
  if (!restored) throw new Error('Saved solar field could not be restored safely')
  const a = JSON.parse(original) as { config?: { body?: { coreDEM?: unknown } }; edits?: Record<string, number>; rover?: { cargo?: Record<string, number>; cargoUsed?: number; pos?: unknown } }
  const b = JSON.parse(restored) as typeof a
  const editsMatch = (left: Record<string, number> = {}, right: Record<string, number> = {}) => {
    const keys = Object.keys(left)
    return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key])
  }
  if (JSON.stringify(a.config?.body?.coreDEM) !== JSON.stringify(b.config?.body?.coreDEM) || !editsMatch(a.edits, b.edits)
    || !editsMatch(a.rover?.cargo, b.rover?.cargo) || (a.rover?.cargoUsed ?? 0) !== (b.rover?.cargoUsed ?? 0)
    || JSON.stringify(a.rover?.pos) !== JSON.stringify(b.rover?.pos)) {
    throw new Error('Saved solar field could not be restored safely')
  }
}

export function writeSolarFieldIdentity(snapshot: string, identity: SolarFieldIdentity): string {
  const doc = JSON.parse(snapshot) as Record<string, unknown>
  doc.landnamTerrain = identity
  const result = JSON.stringify(doc)
  readSolarFieldIdentity(result)
  return result
}
