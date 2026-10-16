import { paletteById, paletteForTarget, type LaserPalette } from '@/lib/mining/laserPalette'

export type FlightBodyKind = 'asteroid' | 'rocky' | 'ice' | 'bands' | 'earth'

export interface FlightBodyInput {
  id: string
  name: string
  type: string
  archetype?: string | null
}

export interface FlightBodySpec {
  kind: FlightBodyKind
  palette: LaserPalette
  seed: string
}

/** Which painted body belongs on the right of a flight. Earth return and Earth-orbit lanes are a disc, never a ground limb. */
export function flightBodyKind(target: FlightBodyInput, returning: boolean): FlightBodyKind {
  if (returning || /earth/i.test(target.id) || /earth/i.test(target.name)) return 'earth'
  if (target.archetype === 'gas-giant') return 'bands'
  if (target.archetype === 'icy') return 'ice'
  if (target.type === 'asteroid') return 'asteroid'
  return 'rocky'
}

export function flightBodySpec(target: FlightBodyInput, returning: boolean): FlightBodySpec {
  const kind = flightBodyKind(target, returning)
  const mapped = paletteForTarget(target)
  let palette = mapped
  if (kind === 'asteroid' && target.archetype === 'M') palette = paletteById('metal') ?? mapped
  else if (kind === 'asteroid' && target.archetype === 'S') palette = paletteById('stony') ?? mapped
  else if (kind === 'asteroid') palette = paletteById('bennu') ?? mapped
  else if (kind === 'ice' || kind === 'bands') palette = paletteById('icy-moon') ?? mapped
  return { kind, palette, seed: `${target.id}:${kind}` }
}
