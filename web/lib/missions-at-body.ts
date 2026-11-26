import { buildingLevel } from '@/lib/data/building-levels'
import { feasibleTargetsFor, isOwnProgramMission } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'

type Mission = Catalog['missions'][number]

/** Moons live under their parent planet on the solar-system map. The map itself still draws them as bodies. */
export const MOON_PARENTS: Readonly<Record<string, string>> = { europa: 'jupiter' }

export interface BodyMissions {
  agency: Mission[]
  client: Mission[]
}

/** Every mission on offer right now, before choosing a place. Agency work and client work stay separate. */
export function offeredMissions(catalog: Catalog, player: Player): Mission[] {
  const free = !!player.freeOperations
  const pool = free ? player.dailyClientPool : undefined
  const poolMissions = pool ? pool.missions.filter(m => !pool.completedIds.includes(m.id)) : []
  const all = pool ? [...poolMissions, ...catalog.missions.filter(m => !(m.client && m.id.startsWith('freeops-')))] : catalog.missions
  const sequence = player.missionsDone + 1
  return all.filter(m => {
    if (m.client && !catalog.clients[m.client]) return false
    return free || m.sequence === sequence
  })
}

function reachable(catalog: Catalog, player: Player, mission: Mission) {
  return feasibleTargetsFor(mission, catalog.targets, catalog.parts, player.missionsDone, player.launchpadUpgraded ?? false, buildingLevel(player, 'launchpad'))
}

/** The missions a player can fly to one body: it must be a feasible destination for their current parts. */
export function missionsAtBody(catalog: Catalog, player: Player, bodyId: string): BodyMissions {
  const here = offeredMissions(catalog, player).filter(m => reachable(catalog, player, m).some(t => t.id === bodyId))
  return {
    agency: here.filter(isOwnProgramMission),
    client: here.filter(m => !isOwnProgramMission(m)),
  }
}

/** Bodies with at least one mission, for lighting the map. */
export function bodiesWithMissions(catalog: Catalog, player: Player): Set<string> {
  const ids = new Set<string>()
  for (const m of offeredMissions(catalog, player)) for (const t of reachable(catalog, player, m)) ids.add(t.id)
  return ids
}
