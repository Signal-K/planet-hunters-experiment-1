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
  // Added (KES-231): missing entries here silently dropped these minerals
  // from a seeded Takeon scene's cargo — for the M3 delivery tutorial, a
  // player carrying only one of these (e.g. a nickel-only "Nickel Line
  // Handoff" leg) ended up with a completely empty rover hold, so
  // DUMP CARGO could never bank anything and the mission soft-locked.
  carbon: 'stone',
  nickel: 'titanium',
  cobalt: 'alloy',
  aluminium: 'iron-plate',
  hydrogen: 'water',
  uranium: 'crystal',
}

/** Takeon ResourceKey -> Landnam mineral id, e.g. for interpreting `mined` events. */
export const TAKEON_TO_LANDNAM_MINERAL: Record<string, string> = {
  iron: 'iron',
  silica: 'silicon',
  copper: 'copper',
  ice: 'ice',
  crystal: 'rare',
  stone: 'carbon',
  titanium: 'nickel',
  alloy: 'cobalt',
  'iron-plate': 'aluminium',
  water: 'hydrogen',
}
