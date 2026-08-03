import type { ResourceKey } from '@takeon/engine'

/**
 * Landnam mineral id -> Takeon ResourceKey, for screens that render real
 * mined/cargo minerals inside a Takeon scene. Takeon's resource set is much
 * smaller than Landnam's mineral catalog, so several Landnam ids share one
 * Takeon visual (e.g. every early-game precious metal renders as `crystal`).
 * This is a rendering convenience only — Landnam's own `cargo`/`mission.payout`
 * numbers remain the economic source of truth wherever this map is used.
 */
export const LANDNAM_TO_TAKEON_MINERAL: Record<string, ResourceKey> = {
  iron: 'iron',
  silicon: 'silica',
  copper: 'copper',
  ice: 'ice',
  rare: 'crystal',
  platinum: 'crystal',
  palladium: 'crystal',
  iridium: 'crystal',
  rhodium: 'crystal',
  gold: 'crystal',
}

/** Takeon ResourceKey -> Landnam mineral id, e.g. for interpreting `mined` events. */
export const TAKEON_TO_LANDNAM_MINERAL: Record<string, string> = {
  iron: 'iron',
  silica: 'silicon',
  copper: 'copper',
  ice: 'ice',
  crystal: 'rare',
}
