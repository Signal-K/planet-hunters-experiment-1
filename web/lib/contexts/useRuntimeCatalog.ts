import { useMemo } from 'react'
import type { Catalog } from '@/lib/catalog'
import type { GameState } from '@/lib/game-types'
import { buildRuntimeCatalog } from '@/lib/runtimeCatalog'

/** Cargo, charge, camera and currency updates cannot change the mission catalog. */
export function useRuntimeCatalog(catalog: Catalog, state: GameState): Catalog {
  const { player, missionId, targetId } = state
  const {
    discoveredExoplanetTargets, freeOperations, transitSatelliteLaunchedAt, missionsDone,
    deepSpaceTelescopeLaunchedAt, deepSpaceTelescopeBuilt, placed, saturnImagerLaunchedAt,
    missionPlans, resourceFocus, stash, orionidsEventStage, probes, completedMissions, badges, meteoriteMastery, orionidsFinds,
    craftServicedAt, spaceStorms, agencyCommunity, agencyLaunches,
  } = player
  const catalogPlayer = useMemo(() => ({
    deepSpaceTelescopeLaunchedAt, deepSpaceTelescopeBuilt, placed, saturnImagerLaunchedAt,
    missionPlans, resourceFocus, stash, orionidsEventStage, probes, completedMissions, badges, meteoriteMastery, orionidsFinds,
    // SSL-852: craft condition decides which servicing missions are offered.
    transitSatelliteLaunchedAt, craftServicedAt, spaceStorms, agencyCommunity, agencyLaunches,
  }), [deepSpaceTelescopeLaunchedAt, deepSpaceTelescopeBuilt, placed, saturnImagerLaunchedAt, missionPlans, resourceFocus, stash, orionidsEventStage, probes, completedMissions, badges, meteoriteMastery, orionidsFinds, transitSatelliteLaunchedAt, craftServicedAt, spaceStorms, agencyCommunity, agencyLaunches])
  return useMemo(() => buildRuntimeCatalog({
    catalog, discoveredTargets: discoveredExoplanetTargets, freeOperations,
    transitSatelliteLaunchedAt, missionId, targetId, missionsDone, player: catalogPlayer,
  }), [catalog, discoveredExoplanetTargets, freeOperations, transitSatelliteLaunchedAt,
    missionId, targetId, missionsDone, catalogPlayer])
}
