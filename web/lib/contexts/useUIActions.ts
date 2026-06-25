import { useState, useCallback } from 'react'
import type { Toast } from '@/components/ui/ToastLayer'
import type { Screen, GameState } from '@/lib/game-types'

let toastSeq = 0
function nextToastId() { return `t${++toastSeq}` }

export function useUIActions(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const go = useCallback((screen: Screen) => {
    setState(s => ({ ...s, screen }))
  }, [setState])

  const setPopup = useCallback((v: string | null) => {
    setState(s => ({ ...s, popup: v }))
  }, [setState])

  const setMenuOpen = useCallback((v: boolean) => {
    setState(s => ({ ...s, menuOpen: v }))
  }, [setState])

  const addToast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    setToasts(ts => [...ts, { id: nextToastId(), message, kind }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const clearTerritoryClaimPopup = useCallback(() => {
    setState(s => ({ ...s, pendingTerritoryClaimFor: undefined, screen: 'market' }))
  }, [setState])

  return { go, setPopup, setMenuOpen, addToast, dismissToast, clearTerritoryClaimPopup, toasts }
}
