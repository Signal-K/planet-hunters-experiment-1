import { mixHex, type Ramp } from './terrainColour'

/** One palette shared by orbital samples and the corresponding surface samples. */
export function solarBiomeColour(biome: string, ground: Ramp): string {
  switch (biome) {
    case 'cloud-band': return mixHex(ground[0], '#f4e7d0', 0.2)
    case 'storm-band': return mixHex(ground[0], ground[2], 0.48)
    case 'ice': case 'icefield': return '#d7e7e8'
    case 'ice-ridges': return '#a9cdd5'
    case 'tundra': return '#b5b8a7'
    case 'ocean': return '#397990'
    case 'grassland': return '#719854'
    case 'drylands': return '#b3a16a'
    case 'methane-lakes': return '#544b37'
    case 'sulfur-plains': return '#d4bd4f'
    case 'volcanic-highlands': return '#766147'
    case 'highlands': case 'crater-highlands': case 'rubble-highlands': case 'metal-ridges':
      return mixHex(ground[0], ground[2], 0.28)
    case 'dark-regolith': return mixHex(ground[0], '#171a20', 0.4)
    default: return ground[0]
  }
}
