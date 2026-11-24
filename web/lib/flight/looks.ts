import type { FlightBodyLook, FlightCraftLook } from '@takeon/engine'
import { flightBodySpec, type FlightBodyInput } from '@/lib/flight-body'
import { customizerPartById, type InstalledCustomizerPartsByKind } from '@/lib/data/shipCustomizer'

/**
 * SSL-848: what Takeon's flight view draws for a Landnam trip. The destination globe is generated from the same
 * palette the mining scene uses for that body, and the craft is the player's own rocket as hull sections.
 */

const hex = (n: number) => `#${(n & 0xffffff).toString(16).padStart(6, '0')}`

function shade(n: number, k: number): string {
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k))))
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

/** A surface ramp from a mining palette, lifted so the sunlit side of a dark body still reads against space. */
function ramp(colors: number[]): string[] {
  const lum = (n: number) => 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)
  const top = Math.max(...colors.map(lum), 1)
  const lift = top < 170 ? 170 / top : 1
  return colors.map((c, i) => shade(c, lift * (0.75 + 0.2 * i)))
}

/** Stable 32-bit seed from text, so a body looks the same on every flight to it. */
export function seedFromText(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export function flightDestinationLook(target: FlightBodyInput, returning: boolean): FlightBodyLook {
  const spec = flightBodySpec(target, returning)
  const seed = seedFromText(spec.seed)
  const p = spec.palette
  switch (spec.kind) {
    case 'earth':
      // Three sea tones before the land ones, so Earth is mostly ocean.
      return { kind: 'ocean', seed: 7, colors: ['#0b2a5a', '#124382', '#1c5fa0', '#3f8f5a', '#8a9a5c', '#d9d2b8'], atmosphere: '#7cc4ff', clouds: 0.5, caps: 0.2 }
    case 'bands':
      return { kind: 'gas', seed, colors: [shade(p.ground, 0.7), hex(p.nearRidge), shade(p.ground, 1.25), hex(p.distant), shade(p.nearRidge, 1.3)], atmosphere: hex(p.skyHorizon), rings: { inner: 1.45, outer: 2.15, color: shade(p.nearRidge, 1.2) } }
    case 'ice':
      return { kind: 'ice', seed, colors: [shade(p.groundDeep, 1.1), hex(p.ground), shade(p.ground, 1.3), '#ffffff'], craters: 0.2, caps: 0.3 }
    case 'asteroid':
      return { kind: 'asteroid', seed, colors: ramp([p.groundDeep, p.groundDeep, p.ground, p.nearRidge]), craters: 0.75, lumpiness: 0.22 }
    default:
      return { kind: 'rocky', seed, colors: ramp([p.groundDeep, p.groundDeep, p.ground, p.nearRidge]), craters: 0.45, atmosphere: hex(p.skyHorizon), caps: 0.1 }
  }
}

/** Hull paint. The kit rocket is white panels with blue trim; the workshop (SSL-850) lets the player change it. */
export interface RocketLivery { hull: string; trim: string }

/**
 * The core stage of the rocket the player builds on the launchpad (art/scenes/launchpad/launchpad-rocket-multistage.png),
 * measured from that drawing tail first: [rows, half-width at the tail end, half-width at the nose end, paint]. The
 * flight view revolves this profile, so the rocket in space is the one that left the pad, seen from behind, and not a
 * second design. 'hull' and 'trim' take the livery; other paints are fixed. Re-measure if the launchpad rocket is redrawn.
 */
export const PAD_ROCKET_PROFILE: ReadonlyArray<readonly [rows: number, tail: number, nose: number, paint: 'hull' | 'hullShade' | 'trim' | `#${string}`]> = [
  [24, 18, 22, '#3e3e42'], [24, 29, 29, '#323136'],
  [20, 29, 29, 'hull'], [10, 29, 29, 'trim'], [84, 29, 29, 'hull'], [4, 29, 29, 'hullShade'], [98, 29, 29, 'hull'],
  [8, 29, 26, 'hull'], [8, 25, 22, 'hull'], [24, 22, 22, 'hull'],
  [16, 22, 26, '#958e8f'],
  [32, 26, 26, 'hull'], [8, 26, 23, 'hull'], [8, 23, 21, 'hull'], [8, 21, 19, 'hull'], [8, 19, 15, 'hull'], [8, 15, 13, 'hull'],
  [8, 13, 9, 'hullShade'], [16, 8, 8, '#48454b'], [16, 9, 8, 'hullShade'], [4, 8, 3, '#8d9ab0'],
]
/** The launchpad rocket's own paint: warm white hull, blue trim. */
export const DEFAULT_LIVERY: RocketLivery = { hull: '#dfd3cc', trim: '#2f6fd0' }

/** The surviving upper stage keeps the profile of the launch artwork. */
export const ORBIT_ROCKET_PROFILE: typeof PAD_ROCKET_PROFILE = [[4, 26, 26, 'trim'], ...PAD_ROCKET_PROFILE.slice(11)]
const PAD_UNIT = 1.5 / ORBIT_ROCKET_PROFILE.reduce((n, r) => n + r[0], 0)

/**
 * Only the upper stage continues beyond ascent. Keep its launchpad paint and profile,
 * without the discarded core and side boosters. Fitted parts change the exhaust.
 */
export function flightCraftLook(parts: InstalledCustomizerPartsByKind | null | undefined, livery: RocketLivery = DEFAULT_LIVERY): FlightCraftLook {
  const engineId = parts?.engine
  const enginePower = Math.min(1, ((engineId ? customizerPartById(engineId) : undefined)?.power ?? 0) / 40)
  const paint: Record<string, string> = { hull: livery.hull, hullShade: shade(parseInt(livery.hull.slice(1), 16), 0.82), trim: livery.trim }
  return {
    sections: ORBIT_ROCKET_PROFILE.map(([rows, tail, nose, color], i) => ({
      id: `core-${i}`, length: rows * PAD_UNIT, r0: tail * PAD_UNIT, r1: nose * PAD_UNIT, color: paint[color] ?? color,
    })),
    plume: enginePower > 0.6 ? '#b9a8ff' : '#ffb23e',
    scale: 1.2,
  }
}
