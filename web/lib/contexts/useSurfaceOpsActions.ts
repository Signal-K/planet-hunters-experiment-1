import { useCallback, useRef } from 'react'
import type { GameState } from '@/lib/game-types'
import {
  SURFACE_FERRY_DURATION_MS,
  surfaceSiteById,
} from '@/lib/data'
import {
  applyAcknowledgeSurfaceFerry,
  applyBuildSettlementLaunchpad,
  applyDispatchSurfaceFerry,
  applyPurchaseTerrainRights,
  applyReconcileSurfaceFerry,
  applyRecordSurfaceMined,
  applyRetrySurfaceFerry,
  surfaceCargoReady,
  surfaceSiteProgress,
} from '@/lib/systems/SurfaceOpsSystem'
import { scheduleLandnamPush } from '@/lib/takeon/push'
import type { Toast } from '@/components/ui/ToastLayer'

export function useSurfaceOpsActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  addToast: (message: string, kind?: Toast['kind']) => void
) {
  const notifiedOperations = useRef(new Set<symbol>())

  const purchaseTerrainRights = useCallback((siteId: string) => {
    setState(state => applyPurchaseTerrainRights(state, siteId))
  }, [setState])

  const buildSettlementLaunchpad = useCallback((siteId: string, pad: 0 | 1 | 2) => {
    setState(state => applyBuildSettlementLaunchpad(state, siteId, pad))
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
            body: `${surfaceSiteById(siteId)?.name ?? 'Surface site'} manifest is ready at Earth Base.`,
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
        queueMicrotask(() => addToast('Surface cargo transferred to Earth Base.', 'ok'))
      }
      return next
    })
  }, [addToast, setState])

  const acknowledgeSurfaceFerry = useCallback((siteId: string) => {
    setState(state => applyAcknowledgeSurfaceFerry(state, siteId))
  }, [setState])

  return {
    purchaseTerrainRights,
    buildSettlementLaunchpad,
    recordSurfaceMined,
    dispatchSurfaceFerry,
    retrySurfaceFerry,
    reconcileSurfaceFerry,
    acknowledgeSurfaceFerry,
  }
}
