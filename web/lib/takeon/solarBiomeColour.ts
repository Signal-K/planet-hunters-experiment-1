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

/** Cloud-top appearance, in planet-fixed radians. Stylised climatology, not current weather. */
export function gasGiantColour(id: string, latitude: number, longitude: number): string | null {
  if (!['jupiter', 'saturn', 'uranus', 'neptune'].includes(id)) return null
  // Longitude-dependent shear breaks the latitude bands into curling cloud edges.
  const wave = Math.sin(longitude * 7 + Math.sin(latitude * 19))
  const turbulence = Math.sin(longitude * 23 + latitude * 31 + wave * 2)
  const lat = latitude + (id === 'jupiter' ? .018 : .006) * wave
  const fine = Math.sin(lat * 140 + turbulence * 1.4) * .5 + .5
  if (id === 'jupiter') {
    const belt = Math.exp(-(((Math.abs(lat) - .29) / .095) ** 2))
      + .65 * Math.exp(-(((Math.abs(lat) - .63) / .08) ** 2))
    let colour = mixHex('#e7d8be', '#99654f', Math.min(.88, belt * .75 + fine * .10))
    colour = mixHex(colour, '#796e63', Math.max(0, (Math.abs(lat) - .85) * .55))
    // Great Red Spot near 22° south; an oval vortex with a pale wake.
    const dx = Math.atan2(Math.sin(longitude - .18), Math.cos(longitude - .18)) / .26
    const dy = (latitude + .38) / .105
    const r = Math.hypot(dx, dy)
    if (r < 1.45) {
      const swirl = Math.sin(r * 19 + Math.atan2(dy, dx) * 2)
      const vortex = mixHex('#b85d3e', '#dc9672', .45 + swirl * .18)
      const rim = Math.min(1, Math.max(0, (r - .65) / .7))
      colour = mixHex(colour, mixHex(vortex, '#eddbc4', rim), Math.min(1, (1.45 - r) * 2))
    }
    return colour
  }
  if (id === 'saturn') {
    const band = .5 + .5 * Math.sin(lat * 27 + wave * .18)
    const polar = Math.max(0, (Math.abs(lat) - .65) / .9)
    return mixHex(mixHex('#eadbb4', '#c6ad7c', band * .35 + fine * .06), '#8e9d96', polar * .45)
  }
  if (id === 'uranus') {
    // Visible-light Uranus is quiet and pale; avoid exaggerated Voyager false colour bands.
    const polarHaze = Math.max(0, (latitude - .25) / 1.3)
    return mixHex(mixHex('#94cbd0', '#b6dad9', polarHaze * .65), '#77b8c2', fine * .025)
  }
  const belt = .5 + .5 * Math.sin(lat * 18 + wave * .12)
  let colour = mixHex('#619fbf', '#3d78a6', belt * .26 + fine * .035)
  const cloud = Math.exp(-(((latitude + .28 + .012 * wave) / .028) ** 2))
    * Math.max(0, Math.sin(longitude * 5 + .7)) ** 8
  colour = mixHex(colour, '#d1e2e5', cloud * .75)
  return colour
}
