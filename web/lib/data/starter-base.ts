/**
 * The Base a new agency starts with. Every surface building is already standing, so the first thing a
 * player does is pick a place on the solar-system map, not build. Expansion underground comes later.
 * Saves that already exist keep exactly what they built: this only seeds a brand-new game.
 */
export const STARTER_BASE_PLACED: readonly string[] = ['launchpad', 'hangar', 'control-station', 'surface-silo']

export const STARTER_BASE_PLOTS: Readonly<Record<string, number>> = { launchpad: 0, hangar: 2, 'control-station': 3, 'surface-silo': 4 }
