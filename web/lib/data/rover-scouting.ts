import type { Target } from '@/lib/data'

// Synthetic gameplay taxonomy for KES-110. This deliberately does not include
// AI4Mars/Zooniverse imagery or subject data while the source audit is open.
export const ROVER_TERRAIN_CLASSES = ['bedrock', 'float-rock', 'sand', 'pebbles', 'vein'] as const

export type RoverTerrainClass = typeof ROVER_TERRAIN_CLASSES[number]

export interface RoverScoutingResult {
  terrain: RoverTerrainClass
  mineral: string
  depositLabel: string
  cargoBonus: number
}

const TERRAIN_LABELS: Record<RoverTerrainClass, string> = {
  bedrock: 'BEDROCK OUTCROP',
  'float-rock': 'FLOAT ROCK FIELD',
  sand: 'SAND DRIFT',
  pebbles: 'PEBBLE PLAIN',
  vein: 'MINERAL VEIN',
}

/**
 * Converts a player classification into deterministic local deposit
 * intelligence. The target's existing mineral mix remains the authority: a
 * classification only identifies one accessible signature and its yield bonus.
 */
export function deriveRoverScoutingResult(target: Target, terrain: RoverTerrainClass): RoverScoutingResult {
  const minerals = target.minerals.length > 0 ? target.minerals : ['iron']
  const index = ROVER_TERRAIN_CLASSES.indexOf(terrain) % minerals.length
  return {
    terrain,
    mineral: minerals[index],
    depositLabel: TERRAIN_LABELS[terrain],
    cargoBonus: terrain === 'vein' ? 3 : 1,
  }
}
