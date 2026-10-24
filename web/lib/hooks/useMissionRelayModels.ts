import { buildingLevel } from '@/lib/data/building-levels'
import { useState } from 'react'
import { feasibleTargetsFor, FREE_OPS_START_MISSIONS_DONE, isMissionBoardMission, tutorialClientMissionOptions } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import { formatCurrency } from '@/lib/format'
import type { Player } from '@/lib/game-types'
import { filterMissionsForSceneScope } from '@/lib/scene-scope'
import type { SceneScope } from '@/lib/scene-scope'
import { SCENE_NAMES } from '@/lib/ui-strings'
import { isTutorialMissionInProgress } from '@/lib/mission-flow'

export interface MissionRelayCardModel {
  mission: Catalog['missions'][number]
  client: Catalog['clients'][string] | null
  targetCount: number
  targetIds: string[]
  displayPayout: number
  unlocked: boolean
  isStoryMission: boolean
  cardState: 'locked' | 'available'
  lockedDetail: string | undefined
  routeLabel: string | undefined
}

export interface UseMissionRelayModelsArgs {
  catalog: Catalog
  missionsDone: number
  freeOperations: boolean
  francs?: number
  player?: Player
  sceneScope?: SceneScope
}

/** Shared business logic behind the client-relay contract picker — the pure
 * data half of what used to live only in MissionBoardScreen.tsx. Reused by
 * the standalone Mission Dispatch route and by Launchpad's embedded contract
 * view (KES-343) so both stay behaviorally identical instead of drifting. */
export function useMissionRelayModels({
  catalog,
  missionsDone,
  freeOperations,
  francs,
  player,
  sceneScope = { kind: 'earth-base', id: 'earth-base', label: SCENE_NAMES.base },
}: UseMissionRelayModelsArgs) {
  const { missions: MISSIONS, clients: CLIENTS, targets, parts } = catalog
  const [previewId, setPreviewId] = useState<string | null>(null)
  const sequence = missionsDone + 1
  // Tutorial runs are deliberately single-threaded: finish the authored
  // mission before accepting another contract. Free Ops remains repeatable;
  // completing a run clears activeMission and exposes the next request.
  const tutorialMissionInProgress = isTutorialMissionInProgress(freeOperations, !!player?.activeMission)
  const missionStartBlockedLabel = 'Finish current mission'

  // Free Ops lists the player's daily client pool (SSL-570): new contracts each day, more clients as missions are
  // flown. The fixed generated client runs it replaces are left out; own runs, instruments and story steps stay.
  // Contracts finished today leave the board until tomorrow.
  const pool = freeOperations ? player?.dailyClientPool : undefined
  const poolMissions = pool ? pool.missions.filter(m => !pool.completedIds.includes(m.id)) : []
  const boardMissions = pool
    ? [...poolMissions, ...MISSIONS.filter(m => !(m.client && m.id.startsWith('freeops-')))]
    : MISSIONS
  const rawAvailable = boardMissions.filter(m => {
    if (!isMissionBoardMission(m, freeOperations)) return false
    if (m.client && !CLIENTS[m.client]) return false
    return freeOperations || m.sequence === sequence
  })

  const available = filterMissionsForSceneScope(rawAvailable, sceneScope, targets, !freeOperations)

  // Never advertise a contract that the current catalog or unlocked rocket
  // parts cannot complete. This is deliberately applied before the board
  // renders, not only when the player reaches Target Picker: an impossible
  // card is already a broken contract from the player's perspective.
  const feasibleCandidates = available.filter(mission =>
    feasibleTargetsFor(
      mission,
      targets,
      parts,
      missionsDone,
      player?.launchpadUpgraded ?? false,
      player ? buildingLevel(player, 'launchpad') : 1,
    ).length > 0,
  )
  const tutorialOptionIds = new Set(freeOperations
    ? feasibleCandidates.map(mission => mission.id)
    : tutorialClientMissionOptions(feasibleCandidates, sequence).map(mission => mission.id))
  const feasibleAvailable = feasibleCandidates.filter(mission => tutorialOptionIds.has(mission.id))

  const onboardingComplete = !freeOperations && feasibleAvailable.length === 0 && missionsDone >= FREE_OPS_START_MISSIONS_DONE

  // Never show locked/future missions during onboarding. Free Ops stays a
  // straightforward catalog of client work rather than a per-player slot list.
  const missionList = feasibleAvailable.filter(mission => isMissionBoardMission(mission, freeOperations))
  const cardModels: MissionRelayCardModel[] = missionList
    .map((m, idx) => {
      const client = m.client ? CLIENTS[m.client] : null
      if (m.client && !client) return null
      const isStoryMission = m.tag === 'STORY' && !m.deliveryTargetId
      const clientReady = freeOperations || m.sequence === sequence
      const jointFundingReady = !m.jointProject || (francs ?? 0) >= m.jointProject.playerCost
      const unlocked = clientReady && jointFundingReady && (freeOperations || available.some(item => item.id === m.id))
      const mTargets = feasibleTargetsFor(m, targets, parts, missionsDone, player?.launchpadUpgraded ?? false, player ? buildingLevel(player, 'launchpad') : 1)
      const displayPayout = m.payout.francs
      const cardState = !unlocked ? 'locked' as const : 'available' as const
      const lockedDetail = !jointFundingReady
        ? `Needs ${formatCurrency(m.jointProject!.playerCost)} co-funding`
        : !clientReady
          ? (client ? `L${client.unlockTier}` : 'Locked')
          : m.sequence <= missionsDone
            ? 'Completed'
            : m.unlockAt
      const routeLabel = m.deliveryTargetId
        ? `${targets.find(t => t.id === m.targetId)?.name ?? m.targetId} → ${targets.find(t => t.id === m.deliveryTargetId)?.name ?? m.deliveryTargetId}`
        : undefined
      return {
        mission: m, client, targetCount: mTargets.length, targetIds: mTargets.map(target => target.id), displayPayout,
        unlocked, isStoryMission, cardState, lockedDetail, routeLabel,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  // STS-582 makes this a client-only surface in Free Ops. Owned flights are
  // filtered above and live on the Mission Board Program tab instead.
  const effectivePreviewId = previewId ?? cardModels.find(c => c.unlocked)?.mission.id ?? cardModels[0]?.mission.id ?? null
  const previewModel = cardModels.find(c => c.mission.id === effectivePreviewId) ?? null
  const selectedIndex = Math.max(0, cardModels.findIndex(c => c.mission.id === effectivePreviewId))
  const selectRelativeSignal = (offset: number) => {
    if (cardModels.length === 0) return
    const nextIndex = (selectedIndex + offset + cardModels.length) % cardModels.length
    setPreviewId(cardModels[nextIndex]?.mission.id ?? null)
  }
  const selectSignal = (id: string) => setPreviewId(id)

  return {
    cardModels,
    previewModel,
    selectedIndex,
    selectRelativeSignal,
    selectSignal,
    onboardingComplete,
    tutorialMissionInProgress,
    missionStartBlockedLabel,
  }
}
