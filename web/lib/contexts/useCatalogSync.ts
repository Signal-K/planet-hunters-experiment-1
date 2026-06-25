import { useState, useEffect, useCallback } from 'react'
import { CONTRACTOR_SLOTS, MINERAL_META, generateDailyContractorPool, refreshPoolIfStale, todayDateKey } from '@/lib/data'
import { STATIC_CATALOG, fetchCatalog } from '@/lib/catalog'
import type { Catalog } from '@/lib/catalog'
import type { GameState } from '@/lib/game-types'
import type { Toast } from '@/components/ui/ToastLayer'

export function useCatalogSync(
  state: GameState,
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  hydrated: boolean,
  isPreview: boolean,
  addToast: (message: string, kind?: Toast['kind']) => void,
) {
  const [catalog, setCatalog] = useState<Catalog>(STATIC_CATALOG)

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {})
  }, [])

  // Initialise / refresh the daily contractor pool when freeOperations unlocks or the calendar day changes.
  useEffect(() => {
    if (!hydrated || isPreview || !state.player.freeOperations) return
    const today = todayDateKey()
    if (state.player.dailyContractorPool?.date === today) return
    setState(s => ({
      ...s,
      player: {
        ...s.player,
        dailyContractorPool: refreshPoolIfStale(
          s.player.dailyContractorPool,
          s.player.missionsDone,
          CONTRACTOR_SLOTS,
          MINERAL_META,
        ),
      },
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isPreview, state.player.freeOperations, state.player.dailyContractorPool?.date])

  // Poll every minute to catch the midnight rollover while the app is open.
  useEffect(() => {
    if (!state.player.freeOperations) return
    const id = setInterval(() => {
      const today = todayDateKey()
      setState(s => {
        if (!s.player.freeOperations || s.player.dailyContractorPool?.date === today) return s
        return {
          ...s,
          player: {
            ...s.player,
            dailyContractorPool: {
              date: today,
              missions: generateDailyContractorPool(today, s.player.missionsDone, CONTRACTOR_SLOTS, MINERAL_META),
              acceptedId: null,
              completedIds: [],
            },
          },
        }
      })
    }, 60_000)
    return () => clearInterval(id)
  }, [state.player.freeOperations, setState])

  // Notify player when refinery contracts become available.
  useEffect(() => {
    if (!hydrated || isPreview || !state.player.freeOperations || state.player.refineryUnlockNotified) return
    const hasContractorBoard = catalog.missions.some(m => m.id.startsWith('freeops-'))
    if (!hasContractorBoard) return
    if (state.screen !== 'missions') return
    setState(s => ({
      ...s,
      player: { ...s.player, refineryUnlocked: true, refineryUnlockNotified: true },
    }))
    addToast('Refinery contracts detected — build the refinery at Earth Base', 'info')
  }, [addToast, catalog.missions, hydrated, isPreview, state.player.freeOperations, state.player.refineryUnlockNotified, state.screen, setState])

  return { catalog }
}
