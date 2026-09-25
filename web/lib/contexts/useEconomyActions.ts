import { useCallback } from 'react'
import { REFINERY_RECIPES } from '@/lib/data'
import { applySellMinerals, applySellRefinedGoods, applyStartRefine, applyCollectRefined, applyUpgradeLaunchpad, applyConfirmShipCustomizerBuild, applyPlaceStructure, applyExcavateSubsurface, applyBuildSubsurfaceRoom } from '@/lib/systems/EconomySystem'
import { applyUnlockSkillNode, applyAcceptLoan, applyAbandonMission } from '@/lib/systems/ProgressionSystem'
import type { TreasuryState } from '@/lib/systems/TreasurySystem'
import { captureGameEvent } from '@/lib/posthog'
import { pbLandnam } from '@/lib/pb-landnam'
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

  const sellRefinedGoods = useCallback((recipeId: string, amount: number) => {
    const recipe = REFINERY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    setState(s => applySellRefinedGoods(s, recipe, amount))
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

  const unlockSkillNode = useCallback((id: string) => {
    setState(s => applyUnlockSkillNode(s, id))
  }, [setState])

  const acceptLoan = useCallback(() => {
    // Loans change both a player's persisted balance and the public treasury,
    // so the backend owns the transaction. Keep the local-only transition as
    // a fallback for preview surfaces, which deliberately have no auth.
    if (!pbLandnam.authStore.isValid) {
      setState(s => applyAcceptLoan(s))
      return
    }
    void pbLandnam.send<{ state: TreasuryState; changed: boolean; principalFrancs: number }>('/api/treasury/bankruptcy-loan', {
      method: 'POST',
    }).then(response => {
      if (!response.changed) return
      setState(s => ({
        ...s,
        popup: null,
        player: {
          ...s.player,
          francs: s.player.francs + response.principalFrancs,
          loanDebt: response.principalFrancs,
          loanOffered: true,
          treasury: response.state,
        },
      }))
    })
  }, [setState])

  const abandonMission = useCallback(() => {
    if (!confirm('Abort this mission? You will lose 10% of the mission payout as a penalty.')) return
    // mission_completed has no failure counterpart today — a player who
    // aborts mid-transit (cargo + progress lost, 10% payout penalty) would
    // otherwise just look like a player who never finished, indistinguishable
    // from someone still in progress.
    let abandonedMissionId: string | null = null
    let abandonedMissionPhase: string | undefined
    setState(s => {
      abandonedMissionId = s.missionId
      abandonedMissionPhase = s.player.missionPhase
      return applyAbandonMission(s, getCatalogMissions())
    })
    if (abandonedMissionId) {
      captureGameEvent('mission_abandoned', {
        mission_id: abandonedMissionId,
        mission_phase: abandonedMissionPhase ?? 'transit',
      })
    }
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
    sellMinerals, sellRefinedGoods, onStartRefine, onCollectRefined, placeStructure, upgradeLaunchpad,
    excavateSubsurface, buildSubsurfaceRoom,
    unlockSkillNode, acceptLoan, abandonMission,
    confirmShipCustomizerBuild,
  }
}
