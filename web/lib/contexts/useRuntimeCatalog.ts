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
    resourceFocus, stash,
  } = player
  const catalogPlayer = useMemo(() => ({
    deepSpaceTelescopeLaunchedAt, deepSpaceTelescopeBuilt, placed, saturnImagerLaunchedAt,
    resourceFocus, stash,
  }), [deepSpaceTelescopeLaunchedAt, deepSpaceTelescopeBuilt, placed, saturnImagerLaunchedAt, resourceFocus, stash])
  return useMemo(() => buildRuntimeCatalog({
    catalog, discoveredTargets: discoveredExoplanetTargets, freeOperations,
    transitSatelliteLaunchedAt, missionId, targetId, missionsDone, player: catalogPlayer,
  }), [catalog, discoveredExoplanetTargets, freeOperations, transitSatelliteLaunchedAt,
    missionId, targetId, missionsDone, catalogPlayer])
}
