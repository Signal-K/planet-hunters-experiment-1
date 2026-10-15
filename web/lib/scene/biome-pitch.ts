import pitch from './biome-pitch.json'
import type { EarthBiomeId } from './base-world'

export interface BiomePitch { label: string; tagline: string; trait: string }

/** Copy for the landscape picker, from shared/scenes/biome-pitch.json (native reads the same file). */
export const BIOME_PITCH = pitch.biomes as Record<EarthBiomeId, BiomePitch>
export const INTRO_COPY = { heading: pitch.heading, lede: pitch.lede, note: pitch.note }
