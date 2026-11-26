/** Parent planets for the named moons supported by Landnam's solar catalog. */
const MOON_PARENTS: Record<string, string> = {
  moon: 'earth', luna: 'earth', phobos: 'mars', deimos: 'mars',
  io: 'jupiter', europa: 'jupiter', ganymede: 'jupiter', callisto: 'jupiter',
  mimas: 'saturn', enceladus: 'saturn', tethys: 'saturn', dione: 'saturn',
  rhea: 'saturn', titan: 'saturn', iapetus: 'saturn',
  miranda: 'uranus', ariel: 'uranus', umbriel: 'uranus', titania: 'uranus', oberon: 'uranus',
  triton: 'neptune',
}

export function moonParent(id: string): string | undefined {
  return MOON_PARENTS[id.toLowerCase()]
}
