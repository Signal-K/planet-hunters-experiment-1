import type { Target } from '@/lib/data/types'
import type { AgencyProjectId } from './programme'
export interface AgencyCommunity {
  projects: Record<AgencyProjectId | 'meteor-echoes', { contributions: number; donatedPerDay: number }>
  surveys: Record<string, string[]>
  worlds: Record<string, Target>
  siteUnlocks: string[]
}
/** A shared snapshot is advisory. It never awards a stamp or replaces personal probe receipts. */
export function communityWorlds(data: AgencyCommunity | undefined): Target[] {
  return Object.values(data?.worlds ?? {}).filter(target => target && typeof target.id === 'string' && target.id.startsWith('exo-') && target.type === 'exoplanet' && Number.isFinite(target.orbit) && target.orbit > 0 && Array.isArray(target.minerals))
}

import type { Player } from '@/lib/game-types'
export function sharedDaily(player: Partial<Pick<Player, 'agencyCommunity'>>, project: AgencyProjectId): number {
  return Math.min(20, Math.max(0, Math.floor(player.agencyCommunity?.projects?.[project]?.donatedPerDay ?? 0)))
}
/** Classify scenes can use donated instruments without pretending the recipient owns one in their save. */
export function scienceAccessPlayer(player: Player): Player {
  return { ...player,
    transitSatelliteLaunchedAt: player.transitSatelliteLaunchedAt || (sharedDaily(player, 'exoplanet-hunters') ? Date.now() : null),
    deepSpaceTelescopeBuilt: player.deepSpaceTelescopeBuilt || sharedDaily(player, 'asteroid-discovery') > 0,
    saturnImagerLaunchedAt: player.saturnImagerLaunchedAt || (sharedDaily(player, 'saturn-storms') ? Date.now() : null),
  }
}

/** Confirmed worlds, downloaded survey knowledge and completed licences survive an older device's save. */
export function mergeAgencyCommunity(local: AgencyCommunity | undefined, remote: AgencyCommunity | undefined): AgencyCommunity | undefined {
  if (!local || !remote) return local ?? remote
  const surveys = Object.fromEntries([...new Set([...Object.keys(remote.surveys), ...Object.keys(local.surveys)])].map(id => [id, [...new Set([...(remote.surveys[id] ?? []), ...(local.surveys[id] ?? [])])].sort()]))
  return { ...local, worlds: { ...remote.worlds, ...local.worlds }, surveys, siteUnlocks: [...new Set([...remote.siteUnlocks, ...local.siteUnlocks])] }
}
