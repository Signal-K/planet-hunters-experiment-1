export const EARTH_BIOMES = ['mountains', 'desert', 'tundra', 'coast'] as const

export type EarthBiome = typeof EARTH_BIOMES[number]

export const DEFAULT_EARTH_BIOME: EarthBiome = 'mountains'

export const EARTH_BIOME_LABEL: Record<EarthBiome, string> = {
  mountains: 'Mountains',
  desert: 'Desert',
  tundra: 'Tundra',
  coast: 'Coast',
}

export function isEarthBiome(value: unknown): value is EarthBiome {
  return typeof value === 'string' && EARTH_BIOMES.includes(value as EarthBiome)
}

export function earthBiome(value: unknown): EarthBiome {
  return isEarthBiome(value) ? value : DEFAULT_EARTH_BIOME
}
