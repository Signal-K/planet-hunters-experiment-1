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

export function structureBuildMs(kind: string): number {
  return STRUCTURE_BUILD_MS[kind] ?? 10_000
}

export function hubConstructionProgress(startedAt: number | undefined, kind: string, now = Date.now()): number {
  if (startedAt === undefined) return 1
  return Math.min(1, Math.max(0, (now - startedAt) / structureBuildMs(kind)))
}

export function isUnderConstruction(startedAt: number | undefined, kind: string, now = Date.now()): boolean {
  return hubConstructionProgress(startedAt, kind, now) < 1
}
