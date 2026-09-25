import type { EntityData } from '@/lib/engine/types'
import { readComponentNumber } from '@/lib/engine/registry'
import type { HubBuildingDef } from '@/components/game/hub/EarthBaseModules'
import type { Player } from '@/lib/game-types'
import { isUnderConstruction } from '@/lib/systems/HubConstructionSystem'

const BUILDING_W: Record<string, number> = {
  launchpad: 105,
  'surface-silo': 62,
  refinery: 84,
  'deep-space-telescope': 86,
  'astronaut-academy': 88,
  command: 84,
}

function effectivePlacementPlots(player: Pick<Player, 'placed' | 'placementPlots'>): Record<string, number> {
  const placed = player.placed ?? []
  const placementPlots = player.placementPlots ?? {}
  const legacyPlaced = (kind: string) => placed.includes(kind) && placementPlots[kind] == null
  return {
    ...placementPlots,
    ...(legacyPlaced('launchpad') ? { launchpad: 0 } : {}),
  }
}

function structureForPlot(effectivePlots: Record<string, number>, plot: number): string | null {
  return Object.entries(effectivePlots).find(([, index]) => index === plot)?.[0] ?? null
}

function isDimmedBuildingKind(kind: string, player: Pick<Player, 'deepSpaceTelescopeBuilt'>): boolean {
  if (kind === 'deep-space-telescope') return !player.deepSpaceTelescopeBuilt
  return false
}

/** Shared Earth Base structure list for Hub and Instrument Hub viewport. */
export function buildHubBuildingDefs(
  player: Pick<Player, 'placed' | 'placementPlots' | 'underConstruction' | 'pendingLaunch' | 'deepSpaceTelescopeBuilt'>,
  plotEntities: EntityData[],
): HubBuildingDef[] {
  const effectivePlots = effectivePlacementPlots(player)
  const sortedEntities = plotEntities.slice().sort((a, b) => {
    const ai = readComponentNumber(a, 'BuildPlot', 'index', 0)
    const bi = readComponentNumber(b, 'BuildPlot', 'index', 0)
    return ai - bi
  })

  return sortedEntities.flatMap((entity, plot) => {
    const kind = structureForPlot(effectivePlots, plot)
    if (!kind) return []
    const startedAt = player.underConstruction?.[kind]
    return [{
      kind,
      plotX: entity.transform.position.x,
      w: BUILDING_W[kind] ?? 78,
      hot: kind === 'launchpad' ? !!player.pendingLaunch : false,
      status: isUnderConstruction(startedAt, kind) ? ('building' as const) : ('ok' as const),
      dimmed: isDimmedBuildingKind(kind, player),
      buildStartedAt: startedAt,
    }]
  })
}
