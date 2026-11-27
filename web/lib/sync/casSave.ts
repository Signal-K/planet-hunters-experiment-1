/** Transactional comparison of the complete server save before writing. */
import type { GameState } from '@/lib/game-types'
import { mergeRemoteState, type PartialSave } from '@/lib/game-state'
import type { SyncLedger } from './ledger'
import { pbLandnam } from '@/lib/pb-landnam'

export interface GameStatesClient {
  getOne(id: string): Promise<{ id: string; state?: unknown }>
}

export const REMOTE_MERGED_EVENT = 'landnam:remote-merged'
const MAX_TRIES = 4

/** Equal apart from the ledger version and updatedAt: re-applying such a result would only re-save and loop writes. */
export function sameContent(a: GameState, b: GameState): boolean {
  const strip = (s: GameState) => JSON.stringify({ ...s, updatedAt: undefined, syncLedger: s.syncLedger ? { ...s.syncLedger, version: 0 } : s.syncLedger })
  return strip(a) === strip(b)
}

function versionOf(state: unknown): number {
  const l = (state as { syncLedger?: SyncLedger | null } | null)?.syncLedger
  return typeof l?.version === 'number' ? l.version : 0
}

type CompareAndSave = (body: { recordId: string; expected: unknown; state: GameState; missionsDone: number }) => Promise<unknown>

export async function casUpdateGameState(client: GameStatesClient, recordId: string, userId: string, local: GameState, save: CompareAndSave = body => pbLandnam.send('/api/game-state/compare-and-save', { method: 'POST', body })): Promise<GameState> {
  let mine = local
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const existing = await client.getOne(recordId)
    const remote = (existing.state ?? null) as PartialSave | null
    const merged = remote && typeof remote === 'object' && remote.player ? mergeRemoteState(mine, remote) : mine
    const version = versionOf(remote) + 1
    const toWrite: GameState = { ...merged, syncLedger: merged.syncLedger ? { ...merged.syncLedger, version } : merged.syncLedger }
    if (pbLandnam.authStore.record?.id && pbLandnam.authStore.record.id !== userId) throw new Error('Account changed while saving')
    try {
      await save({ recordId, expected: existing.state ?? null, state: toWrite, missionsDone: toWrite.player.missionsDone })
      if (typeof window !== 'undefined' && !sameContent(toWrite, local)) window.dispatchEvent(new CustomEvent(REMOTE_MERGED_EVENT, { detail: toWrite }))
      return toWrite
    } catch (error) {
      if ((error as { status?: number }).status !== 409) throw error
    }
    mine = toWrite
  }
  // Let the caller retain the write in the outbox instead of acknowledging
  // a save that we could not verify.
  throw new Error('Game state changed repeatedly while saving; retry required')
}
