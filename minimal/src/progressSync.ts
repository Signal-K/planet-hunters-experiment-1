// Minimal's progress saved to the player's account (SSL-877), not only to the
// browser that played it. The row lives on the shared backend, the one whose
// session Minimal already reads for sign-in (auth.ts), in `lm_progress`: one row
// per player, id = user id, private to them. The collection's migration is in
// signal-k/tickets-please, backend/pb_migrations/20261122120000_lm_progress.js.
//
// The device copy (progress.ts) stays the first write, so a run is never lost to
// a dead network: a failed upload marks the save unsent and the next load or
// `online` event sends it again.
import { sharedPbUrl } from '@landnam/lib/pb-config'
import { authToken, type Pilot } from './auth'
import type { MinimalProgress } from './progress'

const SAVE_VERSION = 1
const unsentKey = (pilotId: string) => `landnam-minimal-v1:unsent:${pilotId}`

interface Row {
  done?: unknown
  earned?: unknown
  stash?: unknown
  runs?: unknown
}

/** The stand-in stage pilot never touches a backend. */
function syncs(pilot: Pilot): boolean {
  return pilot.id !== 'stage' && !!authToken()
}

function recordUrl(pilot: Pilot): string {
  return `${sharedPbUrl()}/api/collections/lm_progress/records/${encodeURIComponent(pilot.id)}`
}

async function send(url: string, method: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: { Authorization: authToken() ?? '', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function fromRow(row: Row): MinimalProgress {
  const record = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, number>) : {})
  return {
    done: Array.isArray(row.done) ? row.done.filter((n): n is number => typeof n === 'number') : [],
    earned: typeof row.earned === 'number' ? row.earned : 0,
    stash: record(row.stash),
    runs: record(row.runs),
  }
}

const totalRuns = (p: MinimalProgress) => Object.values(p.runs).reduce((sum, n) => sum + (n ?? 0), 0)

/**
 * One save from two: the one with more runs flown is further along and wins
 * whole (francs and stash come from the same history, so they are never added
 * across saves, which would pay a run twice). On a tie the account wins, so every
 * device settles on the same save. Finished chapters are kept from both.
 */
export function mergeProgress(device: MinimalProgress, account: MinimalProgress): MinimalProgress {
  const winner = totalRuns(device) > totalRuns(account) ? device : account
  return { ...winner, done: [...new Set([...device.done, ...account.done])].sort((a, b) => a - b) }
}

/** The account's save, or null when it has none yet. Throws when the backend cannot be reached. */
async function pull(pilot: Pilot): Promise<MinimalProgress | null> {
  const res = await send(recordUrl(pilot), 'GET')
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`lm_progress read ${res.status}`)
  return fromRow((await res.json()) as Row)
}

/** Writes the save to the account: update the player's row, or create it the first time. */
export async function pushProgress(pilot: Pilot, progress: MinimalProgress): Promise<boolean> {
  if (!syncs(pilot)) return false
  const body = { ...progress, version: SAVE_VERSION }
  try {
    let res = await send(recordUrl(pilot), 'PATCH', body)
    if (res.status === 404) {
      res = await send(`${sharedPbUrl()}/api/collections/lm_progress/records`, 'POST', { id: pilot.id, user: pilot.id, ...body })
      // Another device created it first: update that row instead.
      if (res.status === 400) res = await send(recordUrl(pilot), 'PATCH', body)
    }
    if (!res.ok) throw new Error(`lm_progress write ${res.status}`)
    markUnsent(pilot, false)
    return true
  } catch {
    markUnsent(pilot, true)
    return false
  }
}

/**
 * Brings the device save and the account save together on load. Returns the
 * merged save (to show and keep on the device), or null when nothing changed or
 * the backend is out of reach (the device save stands).
 */
export async function syncProgress(pilot: Pilot, device: MinimalProgress): Promise<MinimalProgress | null> {
  if (!syncs(pilot)) return null
  let account: MinimalProgress | null
  try {
    account = await pull(pilot)
  } catch {
    return null
  }
  const merged = account ? mergeProgress(device, account) : device
  const accountBehind = !account || JSON.stringify(merged) !== JSON.stringify(account)
  if (accountBehind || isUnsent(pilot)) await pushProgress(pilot, merged)
  return JSON.stringify(merged) === JSON.stringify(device) ? null : merged
}

function markUnsent(pilot: Pilot, unsent: boolean): void {
  try {
    if (unsent) localStorage.setItem(unsentKey(pilot.id), '1')
    else localStorage.removeItem(unsentKey(pilot.id))
  } catch {
    // Storage blocked: the next load re-syncs from the merge anyway.
  }
}

function isUnsent(pilot: Pilot): boolean {
  try {
    return localStorage.getItem(unsentKey(pilot.id)) === '1'
  } catch {
    return false
  }
}
