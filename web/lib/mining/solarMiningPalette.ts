import type { Target } from '@/lib/data'
import { solarBiomeColour } from '@/lib/takeon/solarBiomeColour'
import type { SolarLandingPreview } from '@/lib/takeon/solarLandingPreview'
import { mixHex, terrainLookForTarget } from '@/lib/takeon/terrainColour'
import { DEFAULT_LANDSCAPE } from './landscape'
import type { LaserPalette } from './laserPalette'

/** The laser scene is a stylised cross-section of the selected site's centre biome. */
export function solarMiningPalette(palette: LaserPalette, target: Target, landing: SolarLandingPreview): LaserPalette {
  if (landing.bodyId !== target.id) throw new Error('Mining site belongs to another destination')
  const colour = solarBiomeColour(landing.center.biome, terrainLookForTarget(target).ground)
  const number = (hex: string) => parseInt(hex.slice(1), 16)
  const dark = mixHex(colour, '#101018', 0.35)
  const light = mixHex(colour, '#ffffff', 0.25)
  return {
    ...palette,
    ground: number(colour), groundDeep: number(dark), groundSpeck: number(light),
    distant: number(dark), nearRidge: number(colour),
    landscape: { ...(palette.landscape ?? DEFAULT_LANDSCAPE), tint: colour },
  }
}
