import type { LaserPalette } from './laserPalette'

/** Terrain and deposit art pieces (generated pixel art in /game/assets/mining). */
export type TerrainPiece = 'mountain' | 'ridge' | 'strata'
export type DepositKind = 'iron' | 'nickel' | 'ice' | 'cobalt'

export const TERRAIN_PIECES: TerrainPiece[] = ['mountain', 'ridge', 'strata']
export const DEPOSIT_KINDS: DepositKind[] = ['iron', 'nickel', 'ice', 'cobalt']
/** Native pixel size of each piece. */
export const PIECE_SIZE: Record<TerrainPiece, [number, number]> = { mountain: [128, 112], ridge: [128, 48], strata: [128, 56] }
export const DEPOSIT_SIZE: [number, number] = [28, 22]

export interface LandscapeSpec {
  tint: string
  /** 0..1 multiply-tint strength over the neutral-grey terrain pieces (soft shading kept). */
  shade: number
  seed: number
  /** Pieces per 128 native px of track. */
  density: number
  pieces: Record<TerrainPiece, number>
  deposits: Record<DepositKind, number>
}

export interface PlacedPiece { kind: TerrainPiece; x: number; scale: number; flip: boolean }
export interface PlacedDeposit { kind: DepositKind; x: number; /** Rough tonnage shown on the label. */ amount: number }
export interface LandscapeLayout { tint: number; shade: number; period: number; pieces: PlacedPiece[]; deposits: PlacedDeposit[] }

export const DEFAULT_LANDSCAPE: LandscapeSpec = {
  tint: '#dcc8b0', shade: 1, seed: 1, density: 1,
  pieces: { mountain: 1, ridge: 2, strata: 1 },
  deposits: { iron: 1, nickel: 1, ice: 1, cobalt: 1 },
}

/** FNV-1a 32-bit. Mirrored in native `Landscape.swift`; keep them identical. */
export function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** mulberry32. Mirrored in native. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0
    t ^= (t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<K extends string>(weights: Record<K, number>, keys: K[], r: number): K {
  const total = keys.reduce((s, k) => s + Math.max(0, weights[k] ?? 0), 0)
  if (total <= 0) return keys[0]
  let x = r * total
  for (const k of keys) {
    x -= Math.max(0, weights[k] ?? 0)
    if (x < 0) return k
  }
  return keys[keys.length - 1]
}

/**
 * Seeded layout for one wrap period (native px). The palette picks the look; the target id varies the
 * arrangement, so two asteroids on the same palette still read as different places.
 */
export function landscapeLayout(spec: LandscapeSpec | undefined, targetKey: string, period = 768): LandscapeLayout {
  const s = spec ?? DEFAULT_LANDSCAPE
  const next = rng((s.seed ^ hash32(targetKey)) >>> 0)
  const count = Math.max(2, Math.round((period / 128) * s.density * 1.15))
  const slot = period / count
  const pieces: PlacedPiece[] = []
  for (let i = 0; i < count; i++) {
    const kind = pick(s.pieces, TERRAIN_PIECES, next())
    const x = Math.round(i * slot + next() * slot * 0.6)
    const scale = 0.7 + next() * 0.5
    const flip = next() < 0.5
    pieces.push({ kind, x, scale: Math.round(scale * 100) / 100, flip })
  }
  const deposits: PlacedDeposit[] = []
  const dCount = Math.max(1, Math.round(count / 2))
  for (let i = 0; i < dCount; i++) {
    const kind = pick(s.deposits, DEPOSIT_KINDS, next())
    const x = Math.round((i + next()) * (period / dCount))
    deposits.push({ kind, x, amount: 2 + Math.floor(next() * 7) })
  }
  return { tint: parseInt(s.tint.replace('#', ''), 16), shade: s.shade, period, pieces, deposits }
}

export const DEPOSIT_NAMES: Record<DepositKind, string> = { iron: 'Iron', nickel: 'Nickel', ice: 'Ice', cobalt: 'Cobalt' }

export function layoutForPalette(palette: Pick<LaserPalette, 'landscape'>, targetKey: string, period?: number): LandscapeLayout {
  return landscapeLayout(palette.landscape, targetKey, period)
}
