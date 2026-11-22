// What Minimal shares with the player's Landnam save (Liam, 2026-11-19): their
// francs, and whether they have finished Landnam's onboarding. Everything else
// (chapter progress) is Minimal's own. Read through Landnam's own helpers so the
// two games cannot disagree about where the save lives or what "finished" means.
//
// Francs earned in Minimal are written into the Landnam save too, so Landnam can
// spend them. They go through Landnam's sync ledger (web/lib/sync/ledger.ts) as
// one device of their own, MINIMAL_DEVICE, whose entry always holds Minimal's
// whole total with seq = runs flown. Ledger merges keep the higher seq per
// device, which is the same save Minimal's own merge keeps (more runs wins), so
// the francs are counted once however many devices or merges see them.
import { GAME_STATE_STORAGE_KEY, gameStateStorageKey } from '@landnam/lib/game-state-storage'
import { readCounters, type SyncLedger } from '@landnam/lib/sync/ledger'
import { isTrainingComplete, type FlightPlanProgress } from '@landnam/lib/systems/FlightPlanSystem'
import type { MinimalProgress } from './progress'

export const MINIMAL_DEVICE = 'landnam-minimal'

export interface SharedSave {
  /** The Landnam balance, not counting francs earned in Minimal (those are added on top). */
  francs: number
  onboardingDone: boolean
  /** False when this device holds no Landnam save for the pilot yet. */
  found: boolean
}

interface SavedPlayer {
  francs?: number
  freeOperations?: boolean
  flightPlan?: FlightPlanProgress
}

interface Saved {
  player?: SavedPlayer
  syncLedger?: SyncLedger | null
}

/** Francs from Minimal already inside the Landnam balance. */
const minimalCredit = (save: Saved) => save.syncLedger?.devices?.[MINIMAL_DEVICE]?.plus?.francs ?? 0

export function readSharedSave(userId: string): SharedSave {
  if (import.meta.env.DEV) {
    const stage = new URLSearchParams(location.search).get('stage')
    if (stage === 'onboarded') return { francs: 31_400_000, onboardingDone: true, found: true }
    if (stage !== null) return { francs: 9_000_000, onboardingDone: false, found: true }
  }
  try {
    const raw = localStorage.getItem(gameStateStorageKey(GAME_STATE_STORAGE_KEY, userId))
    const save = raw ? (JSON.parse(raw) as Saved) : undefined
    const player = save?.player
    if (!save || !player) return { francs: 0, onboardingDone: false, found: false }
    return {
      francs: (typeof player.francs === 'number' ? player.francs : 0) - minimalCredit(save),
      onboardingDone: !!player.freeOperations || isTrainingComplete(player.flightPlan),
      found: true,
    }
  } catch {
    return { francs: 0, onboardingDone: false, found: false }
  }
}

const totalRuns = (p: MinimalProgress) => Object.values(p.runs).reduce((sum, n) => sum + (n ?? 0), 0)

/**
 * Puts Minimal's francs into this device's Landnam save, so Landnam shows and
 * spends them. Idempotent; a device without a Landnam save is left alone (its
 * Minimal total still reaches the account through progressSync.ts and lands here
 * on the next device that has one).
 */
export function creditLandnam(userId: string, progress: MinimalProgress): void {
  if (userId === 'stage') return
  try {
    const storageKey = gameStateStorageKey(GAME_STATE_STORAGE_KEY, userId)
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    const save = JSON.parse(raw) as Saved & Record<string, unknown>
    const player = save.player
    if (!player) return
    const seq = totalRuns(progress)
    const prev = save.syncLedger?.devices?.[MINIMAL_DEVICE]
    if (prev && (prev.seq > seq || (prev.seq === seq && (prev.plus?.francs ?? 0) === progress.earned))) return
    if (!prev && progress.earned <= 0) return
    // A save that has never synced gets the ledger Landnam itself would start: its
    // current totals as the base.
    const ledger: SyncLedger = save.syncLedger ?? { v: 1, base: readCounters(player), devices: {}, version: 0 }
    const delta = progress.earned - (prev?.plus?.francs ?? 0)
    const next = {
      ...save,
      player: { ...player, francs: (typeof player.francs === 'number' ? player.francs : 0) + delta },
      syncLedger: { ...ledger, devices: { ...ledger.devices, [MINIMAL_DEVICE]: { seq, plus: { francs: progress.earned }, minus: {} } } },
    }
    localStorage.setItem(storageKey, JSON.stringify(next))
  } catch {
    // Storage blocked or a save Landnam cannot read either: Minimal keeps its own total.
  }
}
