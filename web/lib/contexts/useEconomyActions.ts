import { useCallback } from 'react'
import { REFINERY_RECIPES } from '@/lib/data'
import { applySellMinerals, applyStartRefine, applyCollectRefined, applyUpgradeLaunchpad, applyConfirmShipCustomizerBuild, applyPlaceStructure, applyExcavateSubsurface, applyBuildSubsurfaceRoom } from '@/lib/systems/EconomySystem'
import { applyBuildScanner, applyStartScan, applyCollectScan } from '@/lib/systems/ScanSystem'
import { applyUnlockSkillNode, applyAcceptLoan, applyAbandonMission } from '@/lib/systems/ProgressionSystem'
import type { Catalog } from '@/lib/catalog'
import type { GameState } from '@/lib/game-types'
import type { Mission, ShipRoomKind, StructureBlueprint, SubsurfaceRoomId } from '@/lib/data'

export function useEconomyActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  getCatalogMissions: () => Mission[],
) {
  const sellMinerals = useCallback((mineralId: string, amount: number) => {
    setState(s => applySellMinerals(s, mineralId, amount))
  }, [setState])

  const onStartRefine = useCallback((recipeId: string) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => applyStartRefine(s, recipe))
  }, [setState])

  const onCollectRefined = useCallback((recipeId: string) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => applyCollectRefined(s, recipe))
  }, [setState])

  const placeStructure = useCallback((structure: StructureBlueprint | undefined, kind: string, plot: number) => {
    setState(s => applyPlaceStructure(s, structure, kind, plot))
  }, [setState])

  const upgradeLaunchpad = useCallback(() => {
    setState(s => applyUpgradeLaunchpad(s))
  }, [setState])

  const excavateSubsurface = useCallback(() => {
    setState(s => applyExcavateSubsurface(s))
  }, [setState])

  const buildSubsurfaceRoom = useCallback((roomId: SubsurfaceRoomId) => {
    setState(s => applyBuildSubsurfaceRoom(s, roomId))
  }, [setState])

  const buildScanner = useCallback(() => {
    setState(s => applyBuildScanner(s))
  }, [setState])

  const startScan = useCallback((targetId: string) => {
    setState(s => applyStartScan(s, targetId))
  }, [setState])

  const collectScan = useCallback(() => {
    setState(s => applyCollectScan(s))
  }, [setState])

  const unlockSkillNode = useCallback((id: string) => {
    setState(s => applyUnlockSkillNode(s, id))
  }, [setState])

  const acceptLoan = useCallback(() => {
    setState(s => applyAcceptLoan(s))
  }, [setState])

  const abandonMission = useCallback(() => {
    if (!confirm('Abort this mission? You will lose 10% of the mission payout as a penalty.')) return
    setState(s => applyAbandonMission(s, getCatalogMissions()))
  }, [setState, getCatalogMissions])

  const confirmShipCustomizerBuild = useCallback((
    installed: Partial<Record<ShipRoomKind, string>>,
    prevInstalled: Partial<Record<ShipRoomKind, string>>,
  ) => {
    let applied = false
    setState(s => {
      const result = applyConfirmShipCustomizerBuild(s, installed, prevInstalled)
      applied = result.ok
      return result.state
    })
    return applied
  }, [setState])

  return {
    sellMinerals, onStartRefine, onCollectRefined, placeStructure, upgradeLaunchpad,
    excavateSubsurface, buildSubsurfaceRoom,
    buildScanner, startScan, collectScan, unlockSkillNode, acceptLoan, abandonMission,
    confirmShipCustomizerBuild,
  }
}
