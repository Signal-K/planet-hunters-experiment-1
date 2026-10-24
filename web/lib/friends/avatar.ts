import { hashString, mulberry32 } from './hash'

// Flat CSS-variable tokens only (design rule: no hardcoded hex) — mirrors
// the accent + neutral palette used elsewhere in Landnam's UI.
// No --ln-amber here: amber is reserved for genuine payout/reward emphasis,
// never generic UI chrome like an avatar (standing design rule).
const AVATAR_PALETTE = [
  'var(--ln-cyan)',
  'var(--ln-cyan-bright)',
  'var(--ln-crimson)',
  'var(--ln-surface-3)',
  'var(--ln-text-dim)',
]

export interface AvatarFacet {
  points: string
  color: string
}

/**
 * A deterministic "faceted crystal" identicon: six triangular wedges around
 * a center point, mirrored across three axis pairs so the result reads as a
 * deliberate crystal rather than random noise — flat cel-shaded facets,
 * matching the game's chunky low-poly art direction (no gradients/grain).
 * Same seed (a user id) always produces the same avatar.
 */
export function generateAvatarFacets(seed: string): AvatarFacet[] {
  const rand = mulberry32(hashString(seed))
  const size = 100
  const cx = size / 2
  const cy = size / 2
  const r = size / 2

  const wedgeColors: string[] = []
  for (let i = 0; i < 3; i++) {
    wedgeColors.push(AVATAR_PALETTE[Math.floor(rand() * AVATAR_PALETTE.length)])
  }
  // Mirror the 3 rolled colors into 6 wedges so opposite wedges match —
  // gives the crystal bilateral symmetry instead of a fully random look.
  const colors = [...wedgeColors, ...wedgeColors]

  const facets: AvatarFacet[] = []
  for (let i = 0; i < 6; i++) {
    const a1 = (Math.PI / 3) * i - Math.PI / 2
    const a2 = (Math.PI / 3) * (i + 1) - Math.PI / 2
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2)
    const y2 = cy + r * Math.sin(a2)
    facets.push({
      points: `${cx},${cy} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
      color: colors[i],
    })
  }
  return facets
}
