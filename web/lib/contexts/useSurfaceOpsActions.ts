import { useCallback, useRef } from 'react'
import type { GameState } from '@/lib/game-types'
import {
  SURFACE_FERRY_DURATION_MS,
  surfaceSiteById,
} from '@/lib/data'
import {
  applyAcknowledgeSurfaceFerry,
  applyBuildSettlementLaunchpad,
  applyStartFieldOperation,
  applyDispatchSurfaceFerry,
  applyGrantedSiteAccess,
  applyReconcileSurfaceFerry,
  applyRecordSurfaceMined,
  applyRetrySurfaceFerry,
  surfaceCargoReady,
  surfaceSiteProgress,
} from '@/lib/systems/SurfaceOpsSystem'
import { CLIENT_TERRITORIES, predefinedSiteRightById } from '@/lib/data/site-rights'
import { acquireSiteRight, createSiteRightsState } from '@/lib/systems/SiteRightsSystem'
import { createTreasuryState } from '@/lib/systems/TreasurySystem'
import { TREASURY_STARTING_BALANCE } from '@/lib/data'
import { scheduleLandnamPush } from '@/lib/takeon/push'
import { pbLandnam } from '@/lib/pb-landnam'
import type { Toast } from '@/components/ui/ToastLayer'

export function useSurfaceOpsActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  addToast: (message: string, kind?: Toast['kind']) => void,
  stateRef: React.RefObject<GameState>,
) {
  const notifiedOperations = useRef(new Set<symbol>())

  const purchaseSiteAccess = useCallback((siteId: string) => {
    const now = Date.now()
    const site = predefinedSiteRightById(siteId)
    const current = stateRef.current
    if (!site || !current) return
    const siteRights = current.player.siteRights ?? createSiteRightsState([...CLIENT_TERRITORIES])
    const treasury = current.player.treasury ?? createTreasuryState(TREASURY_STARTING_BALANCE)
    const preview = acquireSiteRight(siteRights, treasury, site, {
      rightId: `site-right:${siteId}:${now}`, ledgerEntryId: `preview:${siteId}:${now}`, playerId: 'local-player',
      mode: 'purchase', activities: ['build', 'mine'], acquiredAt: now,
    })
    if (!preview.acquired || current.player.francs < preview.playerDebitFrancs) return

    void pbLandnam.send<{ acquired: boolean; state: typeof treasury; referenceId: string }>('/api/treasury/site-deed', {
      method: 'POST', body: { siteId },
    }).then(response => {
      if (!response.acquired) return
      setState(state => {
        const liveRights = state.player.siteRights ?? createSiteRightsState([...CLIENT_TERRITORIES])
        const liveTreasury = state.player.treasury ?? createTreasuryState(TREASURY_STARTING_BALANCE)
        const result = acquireSiteRight(liveRights, liveTreasury, site, {
          rightId: `site-right:${siteId}:${now}`,
          ledgerEntryId: response.referenceId,
          playerId: 'local-player',
          mode: 'purchase',
          activities: ['build', 'mine'],
          acquiredAt: now,
        })
        if (!result.acquired || state.player.francs < result.playerDebitFrancs) return state
        const granted = applyGrantedSiteAccess(state, siteId, now)
        return {
          ...granted,
          player: {
            ...granted.player,
            francs: granted.player.francs - result.playerDebitFrancs,
            siteRights: result.siteRights,
            treasury: response.state,
          },
        }
      })
    }).catch(() => addToast('Site deed could not be recorded. Try again.', 'warn'))
  }, [addToast, setState, stateRef])

  const buildSettlementLaunchpad = useCallback((siteId: string, pad: 0 | 1 | 2) => {
    setState(state => applyBuildSettlementLaunchpad(state, siteId, pad))
  }, [setState])

  const startFieldOperation = useCallback((siteId: string) => {
    setState(state => applyStartFieldOperation(state, siteId))
  }, [setState])

  const recordSurfaceMined = useCallback((siteId: string, mineralId: string, amount: number) => {
    const operation = Symbol('record-surface-mined')
    setState(state => {
      const wasReady = surfaceCargoReady(surfaceSiteProgress(state.player, siteId))
      const next = applyRecordSurfaceMined(state, siteId, mineralId, amount)
      const isReady = surfaceCargoReady(surfaceSiteProgress(next.player, siteId))
      if (!wasReady && isReady && !notifiedOperations.current.has(operation)) {
        notifiedOperations.current.add(operation)
        queueMicrotask(() => {
          addToast('Surface cargo buffer is ready for dispatch.', 'ok')
          void scheduleLandnamPush({
            title: 'SURFACE CARGO READY',
            body: `${surfaceSiteById(siteId)?.name ?? 'Surface site'} storage reached capacity.`,
          }).catch(() => {})
        })
      }
      return next
    })
  }, [addToast, setState])

  const dispatchSurfaceFerry = useCallback((siteId: string) => {
    const now = Date.now()
    const operation = Symbol('dispatch-surface-ferry')
    setState(state => {
      const next = applyDispatchSurfaceFerry(state, siteId, now)
      if (next !== state && !notifiedOperations.current.has(operation)) {
        notifiedOperations.current.add(operation)
        queueMicrotask(() => {
          addToast('Automated cargo ferry dispatched.', 'info')
          void scheduleLandnamPush({
            title: 'SURFACE CARGO DELIVERED',
            body: `${surfaceSiteById(siteId)?.name ?? 'Surface site'} manifest is ready at Base.`,
            scheduledFor: now + SURFACE_FERRY_DURATION_MS,
          }).catch(() => {})
        })
      }
      return next
    })
  }, [addToast, setState])

  const retrySurfaceFerry = useCallback((siteId: string) => {
    setState(state => applyRetrySurfaceFerry(state, siteId))
  }, [setState])

  const reconcileSurfaceFerry = useCallback((siteId: string) => {
    const operation = Symbol('reconcile-surface-ferry')
    setState(state => {
      const next = applyReconcileSurfaceFerry(state, siteId)
      if (next !== state && !notifiedOperations.current.has(operation)) {
        notifiedOperations.current.add(operation)
        queueMicrotask(() => addToast('Surface cargo transferred to Base.', 'ok'))
      }
      return next
    })
  }, [addToast, setState])

  const acknowledgeSurfaceFerry = useCallback((siteId: string) => {
    setState(state => applyAcknowledgeSurfaceFerry(state, siteId))
  }, [setState])

  return {
    purchaseSiteAccess,
    startFieldOperation,
    buildSettlementLaunchpad,
    recordSurfaceMined,
    dispatchSurfaceFerry,
    retrySurfaceFerry,
    reconcileSurfaceFerry,
    acknowledgeSurfaceFerry,
  }
}
