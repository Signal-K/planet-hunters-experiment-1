/**
 * Optimistic-concurrency write of `game_states` (SSL-559), shared by the direct
 * save path and the outbox replay. Instead of last-write-wins it reads the
 * record, merges the server copy into ours (ledger + per-field merge), writes
 * with `syncLedger.version = server version + 1`, then re-reads: if another
 * device wrote in between (version moved), it merges again and retries.
 * This is a best-effort check, not a server-side compare-and-swap. A later
 * write can still overwrite an acknowledged save, so it must not be used as
 * the guarantee for irreversible rewards or transfers.
 */
import type { GameState } from '@/lib/game-types'
import { mergeRemoteState, type PartialSave } from '@/lib/game-state'
import type { SyncLedger } from './ledger'

export interface GameStatesClient {
  getOne(id: string): Promise<{ id: string; state?: unknown }>
  update(id: string, data: Record<string, unknown>): Promise<unknown>
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

export async function casUpdateGameState(client: GameStatesClient, recordId: string, userId: string, local: GameState): Promise<GameState> {
  let mine = local
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const existing = await client.getOne(recordId)
    const remote = (existing.state ?? null) as PartialSave | null
    const merged = remote && typeof remote === 'object' && remote.player ? mergeRemoteState(mine, remote) : mine
    const version = versionOf(remote) + 1
    const toWrite: GameState = { ...merged, syncLedger: merged.syncLedger ? { ...merged.syncLedger, version } : merged.syncLedger }
    await client.update(recordId, { user: userId, state: toWrite, missions_done: toWrite.player.missionsDone })
    const check = await client.getOne(recordId)
    if (versionOf(check.state) === version && check.state && sameContent(check.state as GameState, toWrite)) {
      if (typeof window !== 'undefined' && !sameContent(toWrite, local)) window.dispatchEvent(new CustomEvent(REMOTE_MERGED_EVENT, { detail: toWrite }))
      return toWrite
    }
    mine = toWrite
  }
  // Let the caller retain the write in the outbox instead of acknowledging
  // a save that we could not verify.
  throw new Error('Game state changed repeatedly while saving; retry required')
}
