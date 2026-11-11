// Per-shower fragment ledger (SSL-658). Each shower counts only its own fragments.
// The Orionids keep the original fields (orionidsFragments, orionidsRunBaseline), so saves
// from before this change read exactly as they did. Other showers use showerFragments and
// showerRunBaselines, keyed by the shower id.

import type { Player } from '@/lib/game-types'
import { ORIONIDS_SHOWER_ID } from '@/lib/data/showers'
import { mergeFragments, sanitizeFragments, type OrionidsFragments } from '@/lib/orionids/fragments'

export type ShowerLedgerPlayer = Pick<Player, 'orionidsFragments' | 'orionidsRunBaseline' | 'showerFragments' | 'showerRunBaselines'>

const isOrionids = (showerId: string) => showerId === ORIONIDS_SHOWER_ID

function whole(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/** The ledger for one shower. */
export function showerLedger(player: ShowerLedgerPlayer, showerId: string): OrionidsFragments {
  return sanitizeFragments(isOrionids(showerId) ? player.orionidsFragments : player.showerFragments?.[showerId])
}

/** Add catches to one shower's ledger. Other showers' ledgers are untouched. */
export function addShowerCatches<T extends ShowerLedgerPlayer>(player: T, showerId: string, amount: number): T {
  const n = whole(amount)
  if (n <= 0) return player
  const ledger = showerLedger(player, showerId)
  const next = { caught: ledger.caught + n, redeemed: ledger.redeemed }
  if (isOrionids(showerId)) return { ...player, orionidsFragments: next }
  return { ...player, showerFragments: { ...(player.showerFragments ?? {}), [showerId]: next } }
}

/** Catch total at the moment this shower's run was accepted. */
export function showerRunBaseline(player: ShowerLedgerPlayer, showerId: string): number {
  return whole(isOrionids(showerId) ? player.orionidsRunBaseline : player.showerRunBaselines?.[showerId])
}

/** Mark the shower's current catch total as the start of a run. */
export function setShowerRunBaseline<T extends ShowerLedgerPlayer>(player: T, showerId: string): T {
  const caught = showerLedger(player, showerId).caught
  if (isOrionids(showerId)) return { ...player, orionidsRunBaseline: caught }
  return { ...player, showerRunBaselines: { ...(player.showerRunBaselines ?? {}), [showerId]: caught } }
}

/** Merge two saves' non-Orionid ledgers. Counts only move up. */
export function mergeShowerLedgers(
  current: Record<string, OrionidsFragments> | undefined,
  remote: Record<string, OrionidsFragments> | undefined,
): Record<string, OrionidsFragments> | undefined {
  const ids = new Set([...Object.keys(current ?? {}), ...Object.keys(remote ?? {})])
  if (ids.size === 0) return undefined
  return Object.fromEntries([...ids].map(id => [id, mergeFragments(current?.[id], remote?.[id])]))
}
