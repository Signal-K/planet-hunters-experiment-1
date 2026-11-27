import type { Player } from './game-types'
type ScopePlayer = Pick<Player, 'groundTelescopeLevels'>

export function groundTelescopeLevel(player: ScopePlayer, id: string): number {
  const value = player.groundTelescopeLevels?.[id]
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(3, Math.floor(value))) : 1
}

export function sanitizeGroundTelescopeLevels(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const id of GROUND_SCOPE_IDS) {
    const level = groundTelescopeLevel({ groundTelescopeLevels: raw as Record<string, number> }, id)
    if (level > 1) out[id] = level
  }
  return out
}

/** Liam, 20 Nov: one basic mineral for level 2, then two for level 3. Iron is the starter ore. */
export function groundTelescopeUpgrade(player: Pick<Player, 'placed' | 'stash' | 'groundTelescopeLevels'>, id: string) {
  const level = groundTelescopeLevel(player, id)
  const cost = level < 3 ? level : null
  const iron = Math.max(0, player.stash?.iron ?? 0)
  const reason = !(GROUND_SCOPE_IDS as readonly string[]).includes(id) || !player.placed.includes(id)
    ? 'Build this ground telescope first.'
    : cost === null ? 'Fully upgraded.'
    : iron < cost ? `Needs ${cost - iron} more iron (${iron}/${cost} U stored).`
    : null
  return { level, cost, iron, reason }
}

export function applyGroundTelescopeUpgrade(player: Player, id: string): Player {
  const { level, cost, reason } = groundTelescopeUpgrade(player, id)
  if (reason || cost === null) return player
  return {
    ...player,
    stash: { ...player.stash, iron: (player.stash?.iron ?? 0) - cost },
    groundTelescopeLevels: { ...player.groundTelescopeLevels, [id]: level + 1 },
  }
}

const GROUND_SCOPE_IDS = ['ground-telescope', 'ground-telescope-2'] as const
