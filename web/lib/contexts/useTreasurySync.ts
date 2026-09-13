import { useEffect } from 'react'
import type { GameState } from '@/lib/game-types'
import type { TreasuryState } from '@/lib/systems/TreasurySystem'
import { pbLandnam } from '@/lib/pb-landnam'

interface TreasuryRecord { state: TreasuryState }

function isTreasuryState(value: unknown): value is TreasuryState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Partial<TreasuryState>
  return typeof state.balanceFrancs === 'number' && Number.isSafeInteger(state.balanceFrancs) && state.balanceFrancs >= 0
    && Array.isArray(state.ledger)
    && typeof state.loans === 'object' && state.loans !== null
}

/** Hydrates the local projection from the immutable shared treasury record. */
export function useTreasurySync(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  hydrated: boolean,
  isPreview: boolean,
) {
  useEffect(() => {
    if (!hydrated || isPreview) return
    let active = true
    void pbLandnam.collection('public_treasury').getFirstListItem<TreasuryRecord>('singleton_key = "public"')
      .then(record => {
        if (!active || !isTreasuryState(record.state)) return
        setState(current => ({ ...current, player: { ...current.player, treasury: record.state } }))
      })
      .catch(() => {})
    return () => { active = false }
  }, [hydrated, isPreview, setState])
}
