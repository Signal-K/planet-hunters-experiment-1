// Landnam game data: where a player can mine a given mineral (SSL-512).
// Build cards that are short on a material use this so the player always
// learns where to get it instead of hitting a bare "Need 10 aluminium".

import { TARGETS } from './targets'
import { MINERAL_META } from './minerals'

const MAX_SOURCES = 2

/** Nearest bodies whose composition includes the mineral, nearest first. */
export function mineralSourceTargets(mineralId: string): { id: string; name: string }[] {
  return TARGETS
    .filter(t => t.type !== 'exoplanet' && t.minerals.includes(mineralId))
    .sort((a, b) => a.orbit - b.orbit)
    .slice(0, MAX_SOURCES)
    .map(t => ({ id: t.id, name: t.name }))
}

/** One-line, player-facing hint: "Mine Aluminium on 433 Eros or 4 Vesta in Free Ops." */
export function mineralSourceHint(mineralId: string): string {
  const name = MINERAL_META[mineralId]?.name ?? mineralId
  const sources = mineralSourceTargets(mineralId)
  if (sources.length === 0) return `${name} cannot be mined yet. Look for it in a market or refinery.`
  return `Mine ${name} on ${sources.map(s => s.name).join(' or ')} in Free Ops, then bring it home to the Base.`
}

/** Hint for the first of several short minerals, or all of them joined. */
export function mineralSourceHints(mineralIds: string[]): string {
  return mineralIds.map(mineralSourceHint).join(' ')
}
