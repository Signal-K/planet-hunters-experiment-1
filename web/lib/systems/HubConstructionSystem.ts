import { padBuildMultiplier } from '@/lib/data/building-levels'

// Hub/Earth Base structure construction timing. Mirrors ConstructionSystem.ts's
// lazy (now - startedAt) resolution pattern, but scoped to single-instance Hub
// plots (kind -> startedAt) rather than per-target client structures.

export const STRUCTURE_BUILD_MS: Record<string, number> = {
  launchpad: 10_000,
  'surface-silo': 10_000,
  refinery: 10_000,
  'deep-space-telescope': 10_000,
  'astronaut-academy': 10_000,
  garage: 10_000,
}

/** Build time in ms. A bigger Launchpad builds every Base structure faster (SSL-693): x1, x0.75, x0.5. */
export function structureBuildMs(kind: string, padLevel = 1): number {
  return (STRUCTURE_BUILD_MS[kind] ?? 10_000) * padBuildMultiplier(padLevel)
}

export function hubConstructionProgress(startedAt: number | undefined, kind: string, now = Date.now(), padLevel = 1): number {
  if (startedAt === undefined) return 1
  return Math.min(1, Math.max(0, (now - startedAt) / structureBuildMs(kind, padLevel)))
}

export function isUnderConstruction(startedAt: number | undefined, kind: string, now = Date.now(), padLevel = 1): boolean {
  return hubConstructionProgress(startedAt, kind, now, padLevel) < 1
}
