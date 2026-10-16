/** Destination vista shared by the debrief scene and mission-log cards.
 *  Terrain arrangement comes from the laser palette landscape data.
 *  Skies and grounds that read as orange, yellow, green or purple are pulled
 *  toward blueprint blue so the scene stays peaceful. */

export function channels(n: number): [number, number, number] {
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t))
  const ch = (n: number, shift: number) => (n >> shift) & 255
  const lerp = (ca: number, cb: number) => Math.round(ca + (cb - ca) * k)
  return (lerp(ch(a, 16), ch(b, 16)) << 16) | (lerp(ch(a, 8), ch(b, 8)) << 8) | lerp(a & 255, b & 255)
}

export function hex(n: number): string {
  return `#${(n & 0xffffff).toString(16).padStart(6, '0')}`
}

/** Orange, yellow, green or purple. Blue, cream, grey and dusty rose stay. */
export function isForbiddenHue(n: number): boolean {
  const [r, g, b] = channels(n)
  const green = g > r + 10 && g > b + 10 && g > 70
  const orange = r - b > 60 && g > b + 20 && r > 140
  const yellow = r > 180 && g > 150 && b < 130
  const purple = b > r * 0.85 && b > g + 18 && r > g - 5 && b > 70 && g < 180
  return green || orange || yellow || purple
}

const BLUE = 0x31425b

export function peacefulColor(n: number): number {
  return isForbiddenHue(n) ? mix(n, BLUE, 0.72) : n
}

/** Night skies lift off pure black so the ridges still read. */
export function skyColor(n: number): number {
  const p = peacefulColor(n)
  const [r, g, b] = channels(p)
  if ((r + g + b) / 3 < 28) return mix(p, 0x2a3c52, 0.62)
  return p
}

/** Ground plain from the audited landscape tint, not the raw palette ground. */
export function groundColor(tintHex: string | undefined): number {
  const tint = parseInt((tintHex ?? '#9aa4b0').replace('#', ''), 16)
  return mix(peacefulColor(Number.isFinite(tint) ? tint : 0x9aa4b0), 0x1a2836, 0.28)
}

const CRATE_FILES: readonly [string, string][] = [
  ['platin', 'exchange-crate-4-platinum.png'],
  ['silver', 'exchange-crate-5-silver.png'],
  ['ice', 'exchange-crate-6-ice.png'],
  ['water', 'exchange-crate-6-ice.png'],
  ['ammonia', 'exchange-crate-6-ice.png'],
  ['nickel', 'exchange-crate-2-nickel.png'],
  ['iron', 'exchange-crate-1-iron.png'],
  ['hematite', 'exchange-crate-1-iron.png'],
  ['regolith', 'exchange-crate-1-iron.png'],
  ['cobalt', 'exchange-crate-3-steel-blue.png'],
  ['steel', 'exchange-crate-3-steel-blue.png'],
]

export function crateFile(mineralId: string): string {
  const id = mineralId.toLowerCase()
  return CRATE_FILES.find(([key]) => id.includes(key))?.[1] ?? 'exchange-crate-3-steel-blue.png'
}

export interface CrateStack { file: string; count: number }

/** One stack per mineral, capped so a large haul stays a row of crates. */
export function cratePlan(cargo: { id: string; units: number }[]): CrateStack[] {
  return cargo
    .filter(entry => entry.units > 0)
    .slice(0, 4)
    .map(entry => ({ file: crateFile(entry.id), count: Math.min(5, Math.max(1, Math.round(entry.units))) }))
}

/** Where the ground line sits. Portrait leaves the upper third open for the ridges and crates. */
export function surfaceRatio(width: number, height: number, variant: 'scene' | 'card'): number {
  if (variant === 'card') return 0.64
  if (height > width) return 0.36
  if (height < 520) return 0.62
  return 0.72
}
