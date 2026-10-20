// Orionid fragment ledger (SSL-578). The count lives on the player and is
// synced with the save. Redeem spends held fragments for research. Combine
// turns 15 fragments into one fireball. Mastery level stays a later curve;
// the redeemed count is what that curve will read.

import type { Player } from '@/lib/game-types'
import { FIREBALL_FRAGMENT_ID } from '@/lib/orionids/fireball'
import { fragmentsCaughtOnLaunch } from '@/lib/orionids/launch-catch'

export const ORIONID_DEBRIS_ID = 'orionid_debris'
/** Held fragments spent for one research grant. */
export const FRAGMENT_REDEEM_BATCH = 5
/** Research XP for one redeem. A classification is 15; this is the smaller step. */
export const FRAGMENT_REDEEM_RESEARCH = 8
/** Fragments combined into one fireball. Matches the 15× price, so the trade is even. */
export const FRAGMENTS_PER_FIREBALL = 15

export interface OrionidsFragments {
  caught: number
  redeemed: number
}

type FragmentPlayer = Pick<Player, 'stash' | 'orionidsFragments' | 'researchXP' | 'meteoriteMastery'>

function whole(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0
  return Math.floor(value)
}

export function sanitizeFragments(raw: unknown): OrionidsFragments {
  if (!raw || typeof raw !== 'object') return { caught: 0, redeemed: 0 }
  const caught = whole((raw as { caught?: unknown }).caught)
  const redeemed = Math.min(caught, whole((raw as { redeemed?: unknown }).redeemed))
  return { caught, redeemed }
}

/** Keep a catch total from the older per-night field when it is ahead of the ledger. */
export function fragmentsFromSave(raw: unknown, nightCount: number | null | undefined): OrionidsFragments {
  const ledger = sanitizeFragments(raw)
  const night = whole(nightCount)
  return { caught: Math.max(ledger.caught, night), redeemed: ledger.redeemed }
}

/** Caught and redeemed only move up. Redeemed cannot pass caught. */
export function mergeFragments(current: unknown, remote: unknown): OrionidsFragments {
  const left = sanitizeFragments(current)
  const right = sanitizeFragments(remote)
  const caught = Math.max(left.caught, right.caught)
  return { caught, redeemed: Math.min(caught, Math.max(left.redeemed, right.redeemed)) }
}

export function heldFragments(stash: Record<string, number> | undefined): number {
  const held = stash?.[ORIONID_DEBRIS_ID] ?? 0
  return held > 0 ? Math.floor(held) : 0
}

/** Add catches to the ledger. `stash` also puts them in the hold-at-home pile. */
export function addCaughtFragments<T extends FragmentPlayer>(player: T, amount: number, into: 'stash' | 'count' = 'count'): T {
  const n = whole(amount)
  if (n <= 0) return player
  const ledger = sanitizeFragments(player.orionidsFragments)
  const next = {
    ...player,
    orionidsFragments: { caught: ledger.caught + n, redeemed: ledger.redeemed },
  }
  if (into !== 'stash') return next
  const stash = { ...(player.stash ?? {}) }
  stash[ORIONID_DEBRIS_ID] = (stash[ORIONID_DEBRIS_ID] ?? 0) + n
  return { ...next, stash }
}

/** Launch catch: the fragments are home immediately, because the ascent is the drop. */
export function applyLaunchCatch<T extends FragmentPlayer>(player: T, at: number): T {
  return addCaughtFragments(player, fragmentsCaughtOnLaunch(at), 'stash')
}

export function redeemFragments<T extends FragmentPlayer>(player: T): T {
  if (heldFragments(player.stash) < FRAGMENT_REDEEM_BATCH) return player
  const ledger = sanitizeFragments(player.orionidsFragments)
  const stash = { ...(player.stash ?? {}) }
  const left = (stash[ORIONID_DEBRIS_ID] ?? 0) - FRAGMENT_REDEEM_BATCH
  if (left <= 0) delete stash[ORIONID_DEBRIS_ID]
  else stash[ORIONID_DEBRIS_ID] = left
  const redeemed = ledger.redeemed + FRAGMENT_REDEEM_BATCH
  return {
    ...player,
    stash,
    researchXP: (player.researchXP ?? 0) + FRAGMENT_REDEEM_RESEARCH,
    orionidsFragments: { caught: Math.max(ledger.caught, redeemed), redeemed },
    meteoriteMastery: Math.max(player.meteoriteMastery ?? 0, 1),
  }
}

export function combineFragments<T extends FragmentPlayer>(player: T): T {
  if (heldFragments(player.stash) < FRAGMENTS_PER_FIREBALL) return player
  const stash = { ...(player.stash ?? {}) }
  const left = (stash[ORIONID_DEBRIS_ID] ?? 0) - FRAGMENTS_PER_FIREBALL
  if (left <= 0) delete stash[ORIONID_DEBRIS_ID]
  else stash[ORIONID_DEBRIS_ID] = left
  stash[FIREBALL_FRAGMENT_ID] = (stash[FIREBALL_FRAGMENT_ID] ?? 0) + 1
  return { ...player, stash }
}
