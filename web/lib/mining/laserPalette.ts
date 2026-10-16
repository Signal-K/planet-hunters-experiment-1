import raw from './laser-palettes.json'
import type { LandscapeSpec } from './landscape'

export type LaserTerrain = 'rubble' | 'dunes' | 'ice'

export interface LaserPlanet {
  cx: number
  cy: number
  radius: number
  bands: number[]
}

export interface LaserPalette {
  id: string
  skyTop: number
  skyHorizon: number
  skyCss: string
  starAlpha: number
  distant: number
  nearRidge: number
  ground: number
  groundDeep: number
  groundSpeck: number
  beam: number
  beamCore: number
  beamCss: string
  light: number
  lightAlpha: number
  dust: number
  clouds: boolean
  terrain: LaserTerrain
  planet?: LaserPlanet
  /** Ink for ore symbols. The label sits in the sky above the outcrop, so a light sky needs dark ink. */
  labelInk: number
  /** Per-world terrain tint, layout seed and deposit weights (SSL-536). */
  landscape?: LandscapeSpec
}

interface RawPalette {
  skyTop: string
  skyHorizon: string
  starAlpha: number
  distant: string
  nearRidge: string
  ground: string
  groundDeep: string
  groundSpeck: string
  beam: string
  beamCore: string
  light: string
  lightAlpha: number
  dust: string
  clouds: boolean
  terrain: LaserTerrain
  planet?: { cx: number; cy: number; radius: number; bands: string[] }
  landscape?: LandscapeSpec
}

const file = raw as unknown as { palettes: Record<string, RawPalette>; worlds: Record<string, string> }

function hex(value: string): number {
  return parseInt(value.replace('#', ''), 16)
}

function channelAverage(n: number): number {
  return (((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255)) / 3
}

function compile(id: string, src: RawPalette): LaserPalette {
  const ground = hex(src.ground)
  return {
    id,
    skyTop: hex(src.skyTop),
    skyHorizon: hex(src.skyHorizon),
    skyCss: src.skyTop,
    starAlpha: src.starAlpha,
    distant: hex(src.distant),
    nearRidge: hex(src.nearRidge),
    ground,
    groundDeep: hex(src.groundDeep),
    groundSpeck: hex(src.groundSpeck),
    beam: hex(src.beam),
    beamCore: hex(src.beamCore),
    beamCss: src.beam,
    light: hex(src.light),
    lightAlpha: src.lightAlpha,
    dust: hex(src.dust),
    clouds: src.clouds,
    terrain: src.terrain,
    planet: src.planet
      ? { cx: src.planet.cx, cy: src.planet.cy, radius: src.planet.radius, bands: src.planet.bands.map(hex) }
      : undefined,
    landscape: src.landscape,
    labelInk: channelAverage(hex(src.skyHorizon)) > 120 ? 0x1a2430 : 0xffffff,
  }
}

const compiled: Record<string, LaserPalette> = Object.fromEntries(
  Object.entries(file.palettes).map(([id, src]) => [id, compile(id, src)]),
)

export const LASER_PALETTES = compiled

/** Resolve a body to a palette. Unknown worlds fall through by type and archetype, so a new body is one map entry. */
/** Dev/review override (`?palette=bennu|mars|icy-moon`). Unknown ids return null. */
export function paletteById(id: string | null | undefined): LaserPalette | null {
  if (!id) return null
  return compiled[id] ?? null
}

export function paletteForTarget(target: { id: string; type: string; archetype?: string | null }): LaserPalette {
  const mapped = file.worlds[target.id]
  if (mapped && compiled[mapped]) return compiled[mapped]
  if (target.archetype === 'icy' || target.archetype === 'gas-giant') return compiled['icy-moon']
  if (target.type === 'asteroid') return compiled.bennu
  return compiled.mars
}
